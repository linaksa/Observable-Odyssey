/**
 * Testing strategy — GameplayInteractionFlowService
 *
 * Approach:
 * - Exercise handleToggleDoor and handleSanctuaryInteraction with controlled board and active-game fixtures.
 * - Assert socket events, log callbacks, state tracking persistence, and turn-end delegation.
 *
 * Edge cases covered:
 * - Duplicate manipulated door/sanctuary keys are not re-added.
 * - Service failures emit socket errors when possible and remain safe with null sockets.
 * - Tracking is skipped when active-game state or sanctuary metadata cannot be resolved.
 */
import { AppError } from '@app/error-types/app-error';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { DoorService } from '@app/services/gameplay/door-service';
import { SanctuaryService } from '@app/services/gameplay/sanctuary-service';
import { GameplayTurnEndService } from '@app/services/realtime/gameplay-turn-end.service';
import { GameplayInteractionFlowService } from '@app/services/realtime/gameplay-interaction-flow.service';
import { CellType } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { ItemType, SANCTUARY_SIZE } from '@common/items';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Namespace, Socket } from 'socket.io';
import { StatusCodes } from 'http-status-codes';

describe('GameplayInteractionFlowService', () => {
    let service: GameplayInteractionFlowService;
    let doorService: { toggleDoor: sinon.SinonStub };
    let sanctuaryService: { interactSanctuary: sinon.SinonStub };
    let activeGameService: { getActiveGameById: sinon.SinonStub; saveActiveGameById: sinon.SinonStub };
    let turnEndService: { checkEndTurnIfNoMovesLeft: sinon.SinonStub };
    let socket: { emit: sinon.SinonStub };
    let namespace: { to: sinon.SinonStub };
    let namespaceEmit: sinon.SinonStub;
    let emitLog: sinon.SinonStub;

    const makeActiveGame = () => ({
        _id: 'g1',
        manipulatedDoors: [] as string[],
        usedSanctuaries: [] as string[],
        game: {
            board: {
                items: [{ x: 2, y: 2, size: SANCTUARY_SIZE, itemType: ItemType.LifeSanctuary, active: true }],
            },
        },
    });

    beforeEach(() => {
        doorService = { toggleDoor: sinon.stub() };
        sanctuaryService = { interactSanctuary: sinon.stub() };
        activeGameService = {
            getActiveGameById: sinon.stub(),
            saveActiveGameById: sinon.stub().resolves(),
        };
        turnEndService = { checkEndTurnIfNoMovesLeft: sinon.stub().resolves() };
        socket = { emit: sinon.stub() };
        namespaceEmit = sinon.stub();
        namespace = { to: sinon.stub().returns({ emit: namespaceEmit }) };
        emitLog = sinon.stub();

        service = new GameplayInteractionFlowService(
            doorService as unknown as DoorService,
            sanctuaryService as unknown as SanctuaryService,
            activeGameService as unknown as ActiveGameService,
            turnEndService as unknown as GameplayTurnEndService,
        );
    });

    afterEach(() => sinon.restore());

    // handleToggleDoor scenarios.

    it('emits DoorToggled, tracks door and calls checkEndTurn on success — Nominal case', async () => {
        const toggleResult = {
            position: { x: 1, y: 2 },
            cellType: CellType.OpenDoor,
            actionsLeft: 0,
            playerId: 'Alice',
        };
        doorService.toggleDoor.resolves(toggleResult);
        const activeGame = makeActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);

        await service.handleToggleDoor(
            { gameId: 'g1', playerId: 'Alice', position: { x: 1, y: 2 } },
            socket as unknown as Socket,
            namespace as unknown as Namespace,
            emitLog,
        );

        expect(namespaceEmit.calledOnceWithExactly(SocketEvent.DoorToggled, toggleResult)).to.equal(true);
        expect(activeGame.manipulatedDoors).to.include('1,2');
        expect(emitLog.calledOnce).to.equal(true);
        expect(turnEndService.checkEndTurnIfNoMovesLeft.calledOnceWithExactly('g1', 'Alice')).to.equal(true);
    });

    it('does not add duplicate door key — Edge case', async () => {
        const toggleResult = { position: { x: 1, y: 2 }, cellType: CellType.ClosedDoor, actionsLeft: 0, playerId: 'Alice' };
        doorService.toggleDoor.resolves(toggleResult);
        const activeGame = makeActiveGame();
        activeGame.manipulatedDoors.push('1,2'); // Pre-seed with an existing key to verify idempotent tracking.
        activeGameService.getActiveGameById.resolves(activeGame);

        await service.handleToggleDoor(
            { gameId: 'g1', playerId: 'Alice', position: { x: 1, y: 2 } },
            socket as unknown as Socket,
            namespace as unknown as Namespace,
            emitLog,
        );

        expect(activeGame.manipulatedDoors.filter((k) => k === '1,2')).to.have.lengthOf(1);
        expect(activeGameService.saveActiveGameById.called).to.equal(false); // No persistence when tracking data is unchanged.
    });

    it('emits DoorToggleError when toggleDoor throws — Edge case', async () => {
        doorService.toggleDoor.rejects(new AppError([ErrorCode.InvalidDoorTarget], StatusCodes.BAD_REQUEST));

        await service.handleToggleDoor(
            { gameId: 'g1', playerId: 'Alice', position: { x: 1, y: 2 } },
            socket as unknown as Socket,
            namespace as unknown as Namespace,
            emitLog,
        );

        expect(
            socket.emit.calledOnceWithExactly(SocketEvent.DoorToggleError, {
                errorCodes: [ErrorCode.InvalidDoorTarget],
            }),
        ).to.equal(true);
    });

    it('does not throw when socket is null and toggleDoor fails — Edge case', async () => {
        doorService.toggleDoor.rejects(new Error('generic'));

        await service.handleToggleDoor(
            { gameId: 'g1', playerId: 'Alice', position: { x: 0, y: 0 } },
            null,
            namespace as unknown as Namespace,
            emitLog,
        );
        // No assertion needed: this verifies null sockets do not crash error handling.
    });

    it('emits ClosedDoor log message when door is closed — Nominal case', async () => {
        const toggleResult = {
            position: { x: 1, y: 2 },
            cellType: CellType.ClosedDoor,
            actionsLeft: 0,
            playerId: 'Alice',
        };
        doorService.toggleDoor.resolves(toggleResult);
        const activeGame = makeActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);

        await service.handleToggleDoor(
            { gameId: 'g1', playerId: 'Alice', position: { x: 1, y: 2 } },
            socket as unknown as Socket,
            namespace as unknown as Namespace,
            emitLog,
        );

        expect(emitLog.args[0][1]).to.include('fermé');
    });

    // handleSanctuaryInteraction scenarios.

    it('emits SanctuaryInteracted, tracks sanctuary and calls checkEndTurn on success — Nominal case', async () => {
        const interactResult = { itemType: ItemType.LifeSanctuary, playerId: 'Alice' };
        sanctuaryService.interactSanctuary.resolves(interactResult);
        const activeGame = makeActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);

        await service.handleSanctuaryInteraction(
            { gameId: 'g1', playerId: 'Alice', position: { x: 2, y: 2 }, choice: 'life' as never },
            socket as unknown as Socket,
            namespace as unknown as Namespace,
            emitLog,
        );

        expect(namespaceEmit.calledOnceWithExactly(SocketEvent.SanctuaryInteracted, interactResult)).to.equal(true);
        expect(activeGame.usedSanctuaries.some((k) => k.startsWith(ItemType.LifeSanctuary))).to.equal(true);
        expect(emitLog.calledOnce).to.equal(true);
        expect(turnEndService.checkEndTurnIfNoMovesLeft.calledOnceWithExactly('g1', 'Alice')).to.equal(true);
    });

    it('does not add duplicate sanctuary key — Edge case', async () => {
        const interactResult = { itemType: ItemType.LifeSanctuary, playerId: 'Alice' };
        sanctuaryService.interactSanctuary.resolves(interactResult);
        const activeGame = makeActiveGame();
        const key = `${ItemType.LifeSanctuary}:2,2`;
        activeGame.usedSanctuaries.push(key);
        activeGameService.getActiveGameById.resolves(activeGame);

        await service.handleSanctuaryInteraction(
            { gameId: 'g1', playerId: 'Alice', position: { x: 2, y: 2 }, choice: 'life' as never },
            socket as unknown as Socket,
            namespace as unknown as Namespace,
            emitLog,
        );

        expect(activeGame.usedSanctuaries.filter((k) => k === key)).to.have.lengthOf(1);
    });

    it('emits SanctuaryInteractionError when interactSanctuary throws — Edge case', async () => {
        sanctuaryService.interactSanctuary.rejects(new AppError([ErrorCode.SanctuaryInactive], StatusCodes.BAD_REQUEST));

        await service.handleSanctuaryInteraction(
            { gameId: 'g1', playerId: 'Alice', position: { x: 2, y: 2 }, choice: 'life' as never },
            socket as unknown as Socket,
            namespace as unknown as Namespace,
            emitLog,
        );

        expect(
            socket.emit.calledOnceWithExactly(SocketEvent.SanctuaryInteractionError, {
                errorCodes: [ErrorCode.SanctuaryInactive],
            }),
        ).to.equal(true);
    });

    it('does not throw when socket is null and interaction fails — Edge case', async () => {
        sanctuaryService.interactSanctuary.rejects(new Error('generic'));

        await service.handleSanctuaryInteraction(
            { gameId: 'g1', playerId: 'Alice', position: { x: 0, y: 0 }, choice: 'fight' as never },
            null,
            namespace as unknown as Namespace,
            emitLog,
        );
        // No assertion needed: this verifies null sockets do not crash error handling.
    });

    it('uses fight sanctuary label in log message — Nominal case', async () => {
        const interactResult = { itemType: ItemType.FightSanctuary, playerId: 'Alice' };
        sanctuaryService.interactSanctuary.resolves(interactResult);
        const activeGame = makeActiveGame();
        // Add a fight sanctuary item so log labeling can be validated for this branch.
        activeGame.game.board.items.push({ x: 4, y: 4, size: SANCTUARY_SIZE, itemType: ItemType.FightSanctuary, active: true } as never);
        activeGameService.getActiveGameById.resolves(activeGame);

        await service.handleSanctuaryInteraction(
            { gameId: 'g1', playerId: 'Alice', position: { x: 4, y: 4 }, choice: 'fight' as never },
            socket as unknown as Socket,
            namespace as unknown as Namespace,
            emitLog,
        );

        expect(emitLog.args[0][1]).to.include('combat');
    });

    it('skips manipulated-door tracking when active game cannot be loaded', async () => {
        const toggleResult = {
            position: { x: 1, y: 2 },
            cellType: CellType.OpenDoor,
            actionsLeft: 0,
            playerId: 'Alice',
        };
        doorService.toggleDoor.resolves(toggleResult);
        activeGameService.getActiveGameById.resolves(null);

        await service.handleToggleDoor(
            { gameId: 'g1', playerId: 'Alice', position: { x: 1, y: 2 } },
            socket as unknown as Socket,
            namespace as unknown as Namespace,
            emitLog,
        );

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });

    it('skips used-sanctuary tracking when active game cannot be loaded', async () => {
        sanctuaryService.interactSanctuary.resolves({ itemType: ItemType.LifeSanctuary, playerId: 'Alice' });
        activeGameService.getActiveGameById.resolves(null);

        await service.handleSanctuaryInteraction(
            { gameId: 'g1', playerId: 'Alice', position: { x: 2, y: 2 }, choice: 'life' as never },
            socket as unknown as Socket,
            namespace as unknown as Namespace,
            emitLog,
        );

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });

    it('skips used-sanctuary tracking when targeted item is not a sanctuary', async () => {
        sanctuaryService.interactSanctuary.resolves({ itemType: ItemType.LifeSanctuary, playerId: 'Alice' });
        const activeGame = makeActiveGame();
        activeGame.game.board.items = [{ x: 2, y: 2, size: SANCTUARY_SIZE, itemType: ItemType.Flag, active: true } as never];
        activeGameService.getActiveGameById.resolves(activeGame);

        await service.handleSanctuaryInteraction(
            { gameId: 'g1', playerId: 'Alice', position: { x: 2, y: 2 }, choice: 'life' as never },
            socket as unknown as Socket,
            namespace as unknown as Namespace,
            emitLog,
        );

        expect(activeGame.usedSanctuaries.length).to.equal(0);
        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });
});
