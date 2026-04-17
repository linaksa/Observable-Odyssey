/**
 * Testing strategy — GameSocketGameplayEventsService
 *
 * Approach:
 * - Register socket handlers once, then invoke each gameplay event callback directly.
 * - Assert delegation payloads to GameplayActionService and joinable-game refresh side effects.
 *
 * Edge cases covered:
 * - StartGame emits joinable-game updates only when gameplay startup succeeds.
 * - EndTurn and flag-transfer handlers preserve argument ordering when delegated.
 * - Door/sanctuary handlers forward gameplay logs through the shared callback.
 */
import { ActiveGameListSocketsService } from '@app/services/active-game/active-game-list-sockets.service';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { GameSocketGameplayEventsService } from '@app/services/realtime/game-socket-gameplay-events.service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Namespace, Socket } from 'socket.io';

describe('GameSocketGameplayEventsService', () => {
    let service: GameSocketGameplayEventsService;
    let gameplayActionService: {
        handleStartGame: sinon.SinonStub;
        handlePlayerMove: sinon.SinonStub;
        handleToggleDoor: sinon.SinonStub;
        handleSanctuaryInteraction: sinon.SinonStub;
        handleAction: sinon.SinonStub;
        handleChooseAttackPosture: sinon.SinonStub;
        handleEndTurn: sinon.SinonStub;
        handleFlagTaken: sinon.SinonStub;
        handleFlagGiven: sinon.SinonStub;
        handleFlagTransferRejected: sinon.SinonStub;
    };
    let activeGameListSocketService: { emitJoinableGamesUpdated: sinon.SinonStub };
    let gameplayLogService: { emitGameLogToRoom: sinon.SinonStub };
    let socket: Socket;
    let namespace: Namespace;
    const handlers: Record<string, (...args: never[]) => Promise<void>> = {};

    beforeEach(() => {
        gameplayActionService = {
            handleStartGame: sinon.stub().resolves(true),
            handlePlayerMove: sinon.stub().resolves(),
            handleToggleDoor: sinon.stub().resolves(),
            handleSanctuaryInteraction: sinon.stub().resolves(),
            handleAction: sinon.stub().resolves(),
            handleChooseAttackPosture: sinon.stub().resolves(),
            handleEndTurn: sinon.stub().resolves(),
            handleFlagTaken: sinon.stub().resolves(),
            handleFlagGiven: sinon.stub().resolves(),
            handleFlagTransferRejected: sinon.stub().resolves(),
        };
        activeGameListSocketService = { emitJoinableGamesUpdated: sinon.stub() };
        gameplayLogService = { emitGameLogToRoom: sinon.stub() };

        socket = {
            on: sinon.stub().callsFake((event: string, handler: never) => {
                handlers[event] = handler;
            }),
        } as unknown as Socket;

        namespace = {} as Namespace;

        service = new GameSocketGameplayEventsService(
            gameplayActionService as unknown as GameplayActionService,
            gameplayLogService as unknown as GameplayLogService,
            activeGameListSocketService as unknown as ActiveGameListSocketsService,
        );

        service.register(socket, namespace);
    });

    afterEach(() => sinon.restore());

    it('StartGame: calls handleStartGame and emits joinable games update when started — Nominal case', async () => {
        await handlers[SocketEvent.StartGame]('active-game-1' as never);

        expect(gameplayActionService.handleStartGame.calledOnceWithExactly('active-game-1', socket, namespace)).to.equal(true);
        expect(activeGameListSocketService.emitJoinableGamesUpdated.calledOnceWithExactly('active-game-1')).to.equal(true);
    });

    it('StartGame: does not emit joinable games update when not started — Edge case', async () => {
        gameplayActionService.handleStartGame.resolves(false);

        await handlers[SocketEvent.StartGame]('active-game-1' as never);

        expect(activeGameListSocketService.emitJoinableGamesUpdated.called).to.equal(false);
    });

    it('PlayerMove: delegates to handlePlayerMove — Nominal case', async () => {
        const data = { gameId: 'g1', playerId: 'Alice', direction: { x: 1, y: 0 } };

        await handlers[SocketEvent.PlayerMove](data as never);

        expect(gameplayActionService.handlePlayerMove.calledOnceWithExactly(data, socket, namespace)).to.equal(true);
    });

    it('ToggleDoor: delegates to handleToggleDoor — Nominal case', async () => {
        const data = { gameId: 'g1', playerId: 'Alice', position: { x: 1, y: 2 } };

        await handlers[SocketEvent.ToggleDoor](data as never);

        expect(gameplayActionService.handleToggleDoor.calledOnce).to.equal(true);
    });

    it('ToggleDoor: forwards gameplay logs through the callback — Edge case', async () => {
        const data = { gameId: 'g1', playerId: 'Alice', position: { x: 1, y: 2 } };
        gameplayActionService.handleToggleDoor.callsFake(async (_doorData, _socket, _namespace, emitGameLog) => {
            // Edge case: the gameplay callback is invoked to reach the private log helper.
            emitGameLog('g1', 'door toggled');
        });

        await handlers[SocketEvent.ToggleDoor](data as never);

        expect(gameplayLogService.emitGameLogToRoom.calledOnceWithExactly('g1', 'door toggled')).to.equal(true);
    });

    it('InteractSanctuary: delegates to handleSanctuaryInteraction — Nominal case', async () => {
        const data = { gameId: 'g1', playerId: 'Alice', position: { x: 2, y: 2 }, choice: 'life' };

        await handlers[SocketEvent.InteractSanctuary](data as never);

        expect(gameplayActionService.handleSanctuaryInteraction.calledOnce).to.equal(true);
    });

    it('Action: delegates to handleAction — Nominal case', async () => {
        const data = { gameId: 'g1', currentPlayerName: 'Alice', targetName: 'Bob' };

        await handlers[SocketEvent.Action](data as never);

        expect(gameplayActionService.handleAction.calledOnceWithExactly(data, socket, namespace)).to.equal(true);
    });

    it('ChooseAttackPosture: delegates to handleChooseAttackPosture — Nominal case', async () => {
        const data = { gameId: 'g1', playerName: 'Alice', posture: 'Offensive' };

        await handlers[SocketEvent.ChooseAttackPosture](data as never);

        expect(gameplayActionService.handleChooseAttackPosture.calledOnceWithExactly(data, namespace)).to.equal(true);
    });

    it('EndTurn: delegates to handleEndTurn — Nominal case', () => {
        handlers[SocketEvent.EndTurn]('g1' as never);

        expect(gameplayActionService.handleEndTurn.calledOnceWithExactly('g1')).to.equal(true);
    });

    it('FlagTaken: delegates to handleFlagTaken — Nominal case', async () => {
        const data = { gameId: 'g1', playerName: 'Alice' };

        await handlers[SocketEvent.FlagTaken](data as never);

        expect(gameplayActionService.handleFlagTaken.calledOnceWithExactly(data, namespace)).to.equal(true);
    });

    it('FlagGiven: delegates to handleFlagGiven — Nominal case', async () => {
        const data = { gameId: 'g1', playerName: 'Alice' };

        await handlers[SocketEvent.FlagGiven](data as never);

        expect(gameplayActionService.handleFlagGiven.calledOnceWithExactly(data, namespace)).to.equal(true);
    });

    it('RejectFlagTransfer: delegates to handleFlagTransferRejected — Nominal case', async () => {
        const data = { gameId: 'g1', playerName: 'Alice' };

        await handlers[SocketEvent.RejectFlagTransfer](data as never);

        expect(gameplayActionService.handleFlagTransferRejected.calledOnceWithExactly(data, namespace)).to.equal(true);
    });
});
