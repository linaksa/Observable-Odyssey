/**
 * Testing strategy — DebugSocketService
 *
 * Approach:
 * - Register DebugToggle and DebugTeleport handlers and execute each branch with controlled game fixtures.
 * - Validate emitted room/socket events alongside persisted active-game mutations.
 *
 * Edge cases covered:
 * - Toggle requests are ignored for missing game id, non-organizer callers, and fetch failures.
 * - Teleport requests are ignored for invalid turn/state constraints and blocked target cells.
 * - Carried items and starting-position markers do not block debug teleports.
 */
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { DebugSocketService } from '@app/services/realtime/debug-socket.service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { CellType } from '@common/board';
import { ItemType, SANCTUARY_SIZE } from '@common/items';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';

const makeActiveGame = (organizerName = 'Alice', isDebugMode = false) => ({
    _id: 'g1',
    organizerName,
    isDebugMode,
    turnIsInPreparation: false,
    turnOrder: ['Alice', 'Bob'],
    currentPlayerIndex: 0,
    players: [
        { name: 'Alice', hasAbandoned: false, currentPosition: { x: 0, y: 0 }, movementLeft: 3 },
        { name: 'Bob', hasAbandoned: false, currentPosition: { x: 2, y: 2 }, movementLeft: 3 },
    ],
    game: {
        board: {
            cells: [
                [CellType.Empty, CellType.Empty, CellType.Empty],
                [CellType.Empty, CellType.Empty, CellType.Empty],
                [CellType.Empty, CellType.Empty, CellType.Empty],
            ],
            items: [] as { x: number; y: number; itemType: ItemType; isCarried?: boolean; size: number }[],
        },
    },
});

describe('DebugSocketService', () => {
    let service: DebugSocketService;
    let activeGameService: { getActiveGameById: sinon.SinonStub; saveActiveGameById: sinon.SinonStub };
    let positionValidatorService: PositionValidatorService;
    let logService: { emitGameLogToRoom: sinon.SinonStub };
    let socketEmit: sinon.SinonStub;
    let socketToEmit: sinon.SinonStub;
    let socket: {
        emit: sinon.SinonStub;
        to: sinon.SinonStub;
        on: sinon.SinonStub;
    };
    const handlers: Record<string, (...args: never[]) => Promise<void>> = {};

    beforeEach(() => {
        activeGameService = {
            getActiveGameById: sinon.stub().resolves(makeActiveGame()),
            saveActiveGameById: sinon.stub().resolves(),
        };
        positionValidatorService = new PositionValidatorService();
        logService = { emitGameLogToRoom: sinon.stub() };

        socketEmit = sinon.stub();
        socketToEmit = sinon.stub();
        socket = {
            emit: socketEmit,
            to: sinon.stub().returns({ emit: socketToEmit }),
            on: sinon.stub().callsFake((event: string, handler: never) => {
                handlers[event] = handler;
            }),
        };

        service = new DebugSocketService(
            activeGameService as unknown as ActiveGameService,
            positionValidatorService,
            logService as unknown as GameplayLogService,
        );

        service.register(socket as never);
    });

    afterEach(() => sinon.restore());

    // DebugToggle handler scenarios.

    it('does nothing when activeGameId is empty — Edge case', async () => {
        await handlers[SocketEvent.DebugToggle]('Alice' as never, '' as never);

        expect(activeGameService.getActiveGameById.called).to.equal(false);
    });

    it('does nothing when player is not the organizer — Edge case', async () => {
        await handlers[SocketEvent.DebugToggle]('Bob' as never, 'g1' as never);

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });

    it('toggles debug mode and emits to room — Nominal case (off → on)', async () => {
        const game = makeActiveGame('Alice', false);
        activeGameService.getActiveGameById.resolves(game);

        await handlers[SocketEvent.DebugToggle]('Alice' as never, 'g1' as never);

        expect(game.isDebugMode).to.equal(true);
        expect(socketEmit.calledOnce).to.equal(true);
        expect(socketToEmit.calledOnce).to.equal(true);
        expect(logService.emitGameLogToRoom.calledOnce).to.equal(true);
        expect(activeGameService.saveActiveGameById.calledOnce).to.equal(true);
    });

    it('toggles debug mode off and emits correct payload — Nominal case (on → off)', async () => {
        const game = makeActiveGame('Alice', true);
        activeGameService.getActiveGameById.resolves(game);

        await handlers[SocketEvent.DebugToggle]('Alice' as never, 'g1' as never);

        expect(game.isDebugMode).to.equal(false);
        expect(logService.emitGameLogToRoom.args[0][1]).to.include('désactivé');
    });

    it('swallows exceptions from getActiveGameById — Edge case', async () => {
        activeGameService.getActiveGameById.rejects(new Error('DB error'));

        await handlers[SocketEvent.DebugToggle]('Alice' as never, 'g1' as never);
        // No assertion needed: this verifies the handler safely swallows internal fetch failures.
    });

    // DebugTeleport handler scenarios.

    it('does nothing when debug mode is off — Edge case', async () => {
        await handlers[SocketEvent.DebugTeleport]({ gameId: 'g1', playerName: 'Alice', target: { x: 1, y: 0 } } as never);

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });

    it('does nothing when turn is in preparation — Edge case', async () => {
        const game = makeActiveGame('Alice', true);
        game.turnIsInPreparation = true;
        activeGameService.getActiveGameById.resolves(game);

        await handlers[SocketEvent.DebugTeleport]({ gameId: 'g1', playerName: 'Alice', target: { x: 1, y: 0 } } as never);

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });

    it('does nothing when player is not the current player — Edge case', async () => {
        const game = makeActiveGame('Alice', true);
        activeGameService.getActiveGameById.resolves(game);

        await handlers[SocketEvent.DebugTeleport]({ gameId: 'g1', playerName: 'Bob', target: { x: 1, y: 0 } } as never);

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });

    it('does nothing when teleporting player is missing from active roster — Edge case', async () => {
        const game = makeActiveGame('Alice', true);
        game.players = game.players.filter((player) => player.name !== 'Alice');
        activeGameService.getActiveGameById.resolves(game);

        await handlers[SocketEvent.DebugTeleport]({
            gameId: 'g1',
            playerName: 'Alice',
            target: { x: 1, y: 0 },
        } as never);

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });

    it('does nothing when target is not walkable — Edge case', async () => {
        const game = makeActiveGame('Alice', true);
        game.game.board.cells[0][1] = CellType.Wall;
        activeGameService.getActiveGameById.resolves(game);

        await handlers[SocketEvent.DebugTeleport]({ gameId: 'g1', playerName: 'Alice', target: { x: 1, y: 0 } } as never);

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });

    it('does nothing when target cell has a regular item — Edge case', async () => {
        const game = makeActiveGame('Alice', true);
        game.game.board.items.push({ x: 1, y: 0, itemType: ItemType.Flag, isCarried: false, size: 1 });
        activeGameService.getActiveGameById.resolves(game);

        await handlers[SocketEvent.DebugTeleport]({ gameId: 'g1', playerName: 'Alice', target: { x: 1, y: 0 } } as never);

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });

    it('does nothing when another player is on the target cell — Edge case', async () => {
        const game = makeActiveGame('Alice', true);
        game.players[1].currentPosition = { x: 1, y: 0 }; // Simulate occupancy on the teleport target.
        activeGameService.getActiveGameById.resolves(game);

        await handlers[SocketEvent.DebugTeleport]({ gameId: 'g1', playerName: 'Alice', target: { x: 1, y: 0 } } as never);

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });

    it('teleports player and emits PlayerMoved on success — Nominal case', async () => {
        const game = makeActiveGame('Alice', true);
        activeGameService.getActiveGameById.resolves(game);

        await handlers[SocketEvent.DebugTeleport]({ gameId: 'g1', playerName: 'Alice', target: { x: 1, y: 0 } } as never);

        expect(game.players[0].currentPosition).to.deep.equal({ x: 1, y: 0 });
        expect(activeGameService.saveActiveGameById.calledOnce).to.equal(true);
        expect(socketEmit.calledOnce).to.equal(true);
        expect(socketToEmit.calledOnce).to.equal(true);
    });

    it('swallows exceptions from getActiveGameById in teleport — Edge case', async () => {
        activeGameService.getActiveGameById.rejects(new Error('DB error'));

        await handlers[SocketEvent.DebugTeleport]({ gameId: 'g1', playerName: 'Alice', target: { x: 1, y: 0 } } as never);
        // No assertion needed: this verifies teleport failures are swallowed instead of crashing the socket handler.
    });

    it('ignores carried items when checking cell — Edge case', async () => {
        const game = makeActiveGame('Alice', true);
        game.game.board.items.push({ x: 1, y: 0, itemType: ItemType.Flag, isCarried: true, size: 1 });
        activeGameService.getActiveGameById.resolves(game);

        await handlers[SocketEvent.DebugTeleport]({ gameId: 'g1', playerName: 'Alice', target: { x: 1, y: 0 } } as never);

        // Carried items are intentionally ignored by teleport blocking rules.
        expect(activeGameService.saveActiveGameById.calledOnce).to.equal(true);
    });

    it('sanctuary item blocks teleport to any covered cell — Edge case', async () => {
        const game = makeActiveGame('Alice', true);
        game.game.board.items.push({ x: 1, y: 0, itemType: ItemType.LifeSanctuary, isCarried: false, size: SANCTUARY_SIZE });
        activeGameService.getActiveGameById.resolves(game);

        // Target lies inside the sanctuary footprint (x in [1,2], y in [0,1]).
        await handlers[SocketEvent.DebugTeleport]({ gameId: 'g1', playerName: 'Alice', target: { x: 1, y: 0 } } as never);

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
    });

    it('ignores StartingPosition items when checking cell — Edge case', async () => {
        const game = makeActiveGame('Alice', true);
        game.game.board.items.push({ x: 1, y: 0, itemType: ItemType.StartingPosition, isCarried: false, size: 1 });
        activeGameService.getActiveGameById.resolves(game);

        await handlers[SocketEvent.DebugTeleport]({ gameId: 'g1', playerName: 'Alice', target: { x: 1, y: 0 } } as never);

        // Starting-position markers are metadata and should not block teleport.
        expect(activeGameService.saveActiveGameById.calledOnce).to.equal(true);
    });
});
