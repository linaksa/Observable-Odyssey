/**
 * Testing strategy — GameplayActionService
 *
 * Approach:
 * - Validate orchestration across action, movement, interaction, combat, and flag-decision flows.
 * - Assert socket emissions, game-start validation branches, and callback forwarding to gameplay logs.
 *
 * Edge cases covered:
 * - Action requests short-circuit when disallowed or consumed by CTF flag interactions.
 * - StartGame guards reject invalid room/player-count states with explicit socket errors.
 * - Player-abandon handling exits safely when the refreshed active game is unavailable.
 */
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { StartGameService } from '@app/services/gameplay/start-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { GameSessionService } from '@app/services/realtime/game-session.service';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { GameplayRealtimeFlowService } from '@app/services/realtime/gameplay-realtime-flow.service';
import { CellType } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { GameType, Visibility } from '@common/game';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Namespace, Socket } from 'socket.io';

const ODD_PLAYER_COUNT = 3;

const makeActiveGame = (playerCount = 2, gameMode: GameType = GameType.Classic) => ({
    _id: 'active-game-1',
    game: {
        gameMode,
        board: { cells: [[CellType.Empty]] as CellType[][], items: [] as never[] },
        gameTitle: 'Test',
        description: '',
        dateCreated: new Date(),
        lastModifiedDate: new Date(),
        visibility: Visibility.Viewable,
    },
    players: Array.from({ length: playerCount }, (_, i) => ({ name: `Player${i}`, hasAbandoned: false })) as never[],
    turnOrder: [] as string[],
    currentPlayerIndex: 0,
    isFinished: false,
    organizerName: 'Player0',
    winner: null as string | null,
    messages: [] as never[],
    isDebugMode: false,
    maxPlayerCount: 4,
    turnIsInPreparation: false,
    hasFlagId: '',
    turnStartTimeStamp: 0,
    currentAttack: null as null | never,
});

describe('GameplayActionService', () => {
    let service: GameplayActionService;
    let turnService: { endTurn: sinon.SinonStub; startTurn: sinon.SinonStub };
    let startGameService: { initializeGame: sinon.SinonStub };
    let activeGameService: { getActiveGameById: sinon.SinonStub };
    let gameSessionService: { handlePlayerAbandon: sinon.SinonStub };
    let logService: { emitGameLogToRoom: sinon.SinonStub };
    let flowService: {
        canUseAction: sinon.SinonStub;
        handleFlagAction: sinon.SinonStub;
        combatManager: sinon.SinonStub;
        handlePlayerMove: sinon.SinonStub;
        handleToggleDoor: sinon.SinonStub;
        handleSanctuaryInteraction: sinon.SinonStub;
        handleFlagTaken: sinon.SinonStub;
        handleFlagGiven: sinon.SinonStub;
        handleFlagTransferRejected: sinon.SinonStub;
        handleChooseAttackPosture: sinon.SinonStub;
        clearPendingFlagRequest: sinon.SinonStub;
        checkEndTurnIfNoMovesLeft: sinon.SinonStub;
        emitGameEndedIfNeeded: sinon.SinonStub;
    };
    let socket: Socket;
    let socketEmitStub: sinon.SinonStub;
    let namespace: Namespace;
    let namespaceEmit: sinon.SinonStub;

    beforeEach(() => {
        turnService = { endTurn: sinon.stub().resolves(), startTurn: sinon.stub() };
        startGameService = { initializeGame: sinon.stub().resolves() };
        activeGameService = { getActiveGameById: sinon.stub().resolves(makeActiveGame()) };
        gameSessionService = { handlePlayerAbandon: sinon.stub().resolves() };
        logService = { emitGameLogToRoom: sinon.stub() };
        flowService = {
            canUseAction: sinon.stub().resolves(true),
            handleFlagAction: sinon.stub().resolves(false),
            combatManager: sinon.stub().resolves(),
            handlePlayerMove: sinon.stub().resolves(),
            handleToggleDoor: sinon.stub().resolves(),
            handleSanctuaryInteraction: sinon.stub().resolves(),
            handleFlagTaken: sinon.stub().resolves(),
            handleFlagGiven: sinon.stub().resolves(),
            handleFlagTransferRejected: sinon.stub().resolves(),
            handleChooseAttackPosture: sinon.stub().resolves(),
            clearPendingFlagRequest: sinon.stub(),
            checkEndTurnIfNoMovesLeft: sinon.stub().resolves(),
            emitGameEndedIfNeeded: sinon.stub().resolves(false),
        };

        service = new GameplayActionService(
            turnService as unknown as TurnService,
            startGameService as unknown as StartGameService,
            activeGameService as unknown as ActiveGameService,
            gameSessionService as unknown as GameSessionService,
            logService as unknown as GameplayLogService,
            flowService as unknown as GameplayRealtimeFlowService,
        );

        socketEmitStub = sinon.stub();
        socket = { emit: socketEmitStub, rooms: new Set(['active-game-1']) } as unknown as Socket;
        namespaceEmit = sinon.stub();
        namespace = { to: sinon.stub().returns({ emit: namespaceEmit }) } as unknown as Namespace;
    });

    afterEach(() => sinon.restore());

    // handleAction scenarios.

    it('emits ActionError when action is not allowed — Edge case', async () => {
        flowService.canUseAction.resolves(false);

        await service.handleAction({ gameId: 'game-1', currentPlayerName: 'Alice', targetName: 'Bob' }, socket, namespace);

        expect(socketEmitStub.calledOnceWithExactly(SocketEvent.ActionError, { errorCodes: [ErrorCode.ActionNotAllowed] })).to.equal(true);
        expect(flowService.handleFlagAction.called).to.equal(false);
        expect(flowService.combatManager.called).to.equal(false);
    });

    it('starts combat when action is allowed and not handled as a flag action — Nominal case', async () => {
        await service.handleAction({ gameId: 'game-1', currentPlayerName: 'Alice', targetName: 'Bob' }, socket, namespace);

        expect(flowService.canUseAction.calledOnceWithExactly('game-1', 'Alice', 'Bob')).to.equal(true);
        expect(flowService.handleFlagAction.calledOnce).to.equal(true);
        expect(flowService.combatManager.calledOnceWithExactly('game-1', 'Alice', 'Bob', socket, sinon.match.any)).to.equal(true);
    });

    it('skips combat when flag action is handled — Edge case', async () => {
        flowService.handleFlagAction.resolves(true);

        await service.handleAction({ gameId: 'game-1', currentPlayerName: 'Alice', targetName: 'Bob' }, socket, namespace);

        expect(flowService.combatManager.called).to.equal(false);
    });

    // handleEndTurn scenarios.

    it('clears pending flag request and ends turn — Nominal case', async () => {
        await service.handleEndTurn('g1');

        expect(flowService.clearPendingFlagRequest.calledWithExactly('g1')).to.equal(true);
        expect(turnService.endTurn.calledOnceWithExactly('g1')).to.equal(true);
    });

    // handlePlayerMove scenarios.

    it('delegates to flowService.handlePlayerMove — Nominal case', async () => {
        const data = { gameId: 'g1', playerId: 'Alice', direction: { x: 1, y: 0 } };
        await service.handlePlayerMove(data as never, socket, namespace);
        expect(flowService.handlePlayerMove.calledOnceWithExactly(data, socket, namespace)).to.equal(true);
    });

    // handleToggleDoor scenarios.

    it('delegates to flowService.handleToggleDoor — Nominal case', async () => {
        const data = { gameId: 'g1', playerId: 'Alice', position: { x: 1, y: 2 } };
        const emitLog = sinon.stub();
        await service.handleToggleDoor(data as never, socket, namespace, emitLog);
        expect(flowService.handleToggleDoor.calledOnce).to.equal(true);
    });

    it('delegates sanctuary interaction handling to realtime flow', async () => {
        const data = { gameId: 'g1', playerId: 'Alice', position: { x: 1, y: 1 }, choice: 'standard' };
        const emitLog = sinon.stub();

        await service.handleSanctuaryInteraction(data as never, socket, namespace, emitLog);

        expect(flowService.handleSanctuaryInteraction.calledOnceWithExactly(data, socket, namespace, emitLog)).to.equal(true);
    });

    // handleStartGame scenarios.

    it('returns false when activeGameId is empty — Edge case', async () => {
        const result = await service.handleStartGame('', socket, namespace);
        expect(result).to.equal(false);
    });

    it('returns false when socket is not in the game room — Edge case', async () => {
        (socket.rooms as Set<string>).clear();

        const result = await service.handleStartGame('active-game-1', socket, namespace);

        expect(result).to.equal(false);
    });

    it('returns false and emits StartGameError for CTF game with odd player count — Edge case', async () => {
        activeGameService.getActiveGameById.resolves(makeActiveGame(ODD_PLAYER_COUNT, GameType.Ctf));

        const result = await service.handleStartGame('active-game-1', socket, namespace);

        expect(result).to.equal(false);
        expect(
            socketEmitStub.calledOnceWithExactly(SocketEvent.StartGameError, {
                errorCodes: [ErrorCode.CtfRequiresEvenPlayerCount],
            }),
        ).to.equal(true);
    });

    it('returns false and emits StartGameError when fewer than 2 players — Edge case', async () => {
        activeGameService.getActiveGameById.resolves(makeActiveGame(1));

        const result = await service.handleStartGame('active-game-1', socket, namespace);

        expect(result).to.equal(false);
        expect(
            socketEmitStub.calledOnceWithExactly(SocketEvent.StartGameError, {
                errorCodes: [ErrorCode.StartGameRequiresAtLeastTwoPlayers],
            }),
        ).to.equal(true);
    });

    it('initializes game, emits updates and starts turn on success — Nominal case', async () => {
        const updatedGame = makeActiveGame(2);
        activeGameService.getActiveGameById.onFirstCall().resolves(makeActiveGame(2)).resolves(updatedGame);

        const result = await service.handleStartGame('active-game-1', socket, namespace);

        expect(result).to.equal(true);
        expect(startGameService.initializeGame.calledOnceWithExactly('active-game-1')).to.equal(true);
        expect(namespaceEmit.calledWithExactly(SocketEvent.GameStarted, 'active-game-1')).to.equal(true);
        expect(turnService.startTurn.calledOnceWithExactly('active-game-1')).to.equal(true);
    });

    // Flag transfer and posture delegation scenarios.

    it('delegates handleFlagTaken to flowService — Nominal case', async () => {
        const data = { gameId: 'g1', playerName: 'Alice' };
        await service.handleFlagTaken(data as never, namespace);
        expect(flowService.handleFlagTaken.calledOnce).to.equal(true);
    });

    it('delegates handleFlagGiven to flowService — Nominal case', async () => {
        const data = { gameId: 'g1', playerName: 'Alice' };
        await service.handleFlagGiven(data as never, namespace);
        expect(flowService.handleFlagGiven.calledOnce).to.equal(true);
    });

    it('delegates handleFlagTransferRejected to flowService — Nominal case', async () => {
        const data = { gameId: 'g1', playerName: 'Alice' };
        await service.handleFlagTransferRejected(data as never, namespace);
        expect(flowService.handleFlagTransferRejected.calledOnce).to.equal(true);
    });

    it('delegates handleChooseAttackPosture to flowService — Nominal case', async () => {
        const data = { gameId: 'g1', playerName: 'Alice', posture: 'Offensive' };
        await service.handleChooseAttackPosture(data as never, namespace);
        expect(flowService.handleChooseAttackPosture.calledOnce).to.equal(true);
    });

    it('delegates checkEndTurnIfNoMovesLeft to flowService — Nominal case', async () => {
        await service.checkEndTurnIfNoMovesLeft('g1', 'Alice');
        expect(flowService.checkEndTurnIfNoMovesLeft.calledOnceWithExactly('g1', 'Alice')).to.equal(true);
    });

    it('handles player abandon and clears pending flag request when game ends', async () => {
        const data = { gameId: 'active-game-1', playerId: 'Alice' };
        flowService.emitGameEndedIfNeeded.resolves(true);
        activeGameService.getActiveGameById.resolves(makeActiveGame());

        await service.handlePlayerAbandon(data as never, namespace, socket);

        expect(gameSessionService.handlePlayerAbandon.calledOnceWithExactly(data, namespace, socket, sinon.match.func)).to.equal(true);
        expect(flowService.emitGameEndedIfNeeded.calledOnceWithExactly('active-game-1', namespace)).to.equal(true);
        expect(flowService.clearPendingFlagRequest.calledWithExactly('active-game-1')).to.equal(true);
    });

    it('returns early in handlePlayerAbandon when active game cannot be reloaded', async () => {
        const data = { gameId: 'missing-game', playerId: 'Alice' };
        activeGameService.getActiveGameById.resolves(null);

        await service.handlePlayerAbandon(data as never, namespace, socket);

        expect(flowService.emitGameEndedIfNeeded.called).to.equal(false);
    });

    it('forwards combatManager game-log callback to gameplay log service', async () => {
        flowService.combatManager.callsFake(async (_gameId, _attacker, _defender, _socket, context) => {
            context.emitGameLog('active-game-1', 'combat-log');
        });

        await service.combatManager('active-game-1', 'Alice', 'Bob', socket, namespace);

        expect(logService.emitGameLogToRoom.calledOnceWithExactly('active-game-1', 'combat-log')).to.equal(true);
    });

    it('forwards handleAction flag callback to gameplay log service', async () => {
        flowService.handleFlagAction.callsFake(async (_data, _namespace, emitGameLog) => {
            emitGameLog('active-game-1', 'flag-log');
            return true;
        });

        await service.handleAction({ gameId: 'active-game-1', currentPlayerName: 'Alice', targetName: 'Bob' }, socket, namespace);

        expect(logService.emitGameLogToRoom.calledOnceWithExactly('active-game-1', 'flag-log')).to.equal(true);
    });

    it('forwards flag decision callbacks to gameplay log service', async () => {
        flowService.handleFlagTaken.callsFake(async (_data, _namespace, emitGameLog) => emitGameLog('g1', 'taken-log'));
        flowService.handleFlagGiven.callsFake(async (_data, _namespace, emitGameLog) => emitGameLog('g1', 'given-log'));
        flowService.handleFlagTransferRejected.callsFake(async (_data, _namespace, emitGameLog) => emitGameLog('g1', 'rejected-log'));

        await service.handleFlagTaken({ gameId: 'g1', newFlagCarrierName: 'Alice' } as never, namespace);
        await service.handleFlagGiven({ gameId: 'g1', newFlagCarrierName: 'Alice' } as never, namespace);
        await service.handleFlagTransferRejected({ gameId: 'g1', responderName: 'Bob' } as never, namespace);

        expect(logService.emitGameLogToRoom.calledWithExactly('g1', 'taken-log')).to.equal(true);
        expect(logService.emitGameLogToRoom.calledWithExactly('g1', 'given-log')).to.equal(true);
        expect(logService.emitGameLogToRoom.calledWithExactly('g1', 'rejected-log')).to.equal(true);
    });
});
