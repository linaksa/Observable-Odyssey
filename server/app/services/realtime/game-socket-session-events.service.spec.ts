/**
 * Testing strategy — GameSocketSessionEventsService
 *
 * Approach:
 * - Execute registered JoinGame/KickPlayer/LeaveWaitingRoom/PlayerAbandon/disconnect handlers.
 * - Validate payload parsing, room join behavior, player-list emission, and delegated callbacks.
 *
 * Edge cases covered:
 * - Join flow exits cleanly when activeGameId is missing or active-game loading fails.
 * - Optional playerName payloads skip name mapping without breaking room join and player broadcasts.
 * - GC reevaluation is triggered after successful join registration.
 */
import { ActiveGameGarbageCollectorService } from '@app/services/active-game/active-game-garbage-collector.service';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { GameSessionService } from '@app/services/realtime/game-session.service';
import { GameSocketSessionEventsService } from '@app/services/realtime/game-socket-session-events.service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Namespace, Socket } from 'socket.io';

describe('GameSocketSessionEventsService', () => {
    let service: GameSocketSessionEventsService;
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
    };
    let gameSessionService: {
        parseJoinGamePayload: sinon.SinonStub;
        leaveOtherGameRooms: sinon.SinonStub;
        setSocketPlayerName: sinon.SinonStub;
        handlePlayerKick: sinon.SinonStub;
        handleLeaveWaitingRoom: sinon.SinonStub;
        handlePlayerAbandon: sinon.SinonStub;
        handleDisconnect: sinon.SinonStub;
    };
    let activeGameGarbageCollectorService: {
        reevaluateFinishedGameMark: sinon.SinonStub;
    };
    let gameplayLogService: {
        emitGameLogToRoom: sinon.SinonStub;
    };
    let socket: Socket;
    let namespace: Namespace;
    let handlers: Map<string, (payload?: unknown) => Promise<void>>;

    beforeEach(() => {
        activeGameService = {
            getActiveGameById: sinon.stub().resolves({ players: [{ name: 'Alice' }] }),
        };
        gameSessionService = {
            parseJoinGamePayload: sinon.stub().returns({ activeGameId: 'active-game-1', playerName: 'Alice' }),
            leaveOtherGameRooms: sinon.stub(),
            setSocketPlayerName: sinon.stub(),
            handlePlayerKick: sinon.stub().resolves(),
            handleLeaveWaitingRoom: sinon.stub().resolves(),
            handlePlayerAbandon: sinon.stub().resolves(),
            handleDisconnect: sinon.stub().resolves(),
        };
        activeGameGarbageCollectorService = {
            reevaluateFinishedGameMark: sinon.stub().resolves(),
        };
        gameplayLogService = {
            emitGameLogToRoom: sinon.stub(),
        };
        handlers = new Map();

        socket = {
            on: sinon.stub().callsFake((event: string, handler: (payload?: unknown) => Promise<void>) => {
                handlers.set(event, handler);
            }),
            join: sinon.stub(),
        } as unknown as Socket;

        const emitStub = sinon.stub();
        namespace = {
            to: sinon.stub().returns({ emit: emitStub }),
        } as unknown as Namespace;

        service = new GameSocketSessionEventsService(
            activeGameService as unknown as ActiveGameService,
            gameSessionService as unknown as GameSessionService,
            gameplayLogService as unknown as GameplayLogService,
            activeGameGarbageCollectorService as unknown as ActiveGameGarbageCollectorService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('reevaluates GC mark after joining a game and registering player name', async () => {
        service.register(socket, namespace);

        await handlers.get(SocketEvent.JoinGame)?.({ activeGameId: 'active-game-1', playerName: 'Alice' });

        expect((socket.join as sinon.SinonStub).calledOnceWithExactly('active-game-1')).to.equal(true);
        expect(gameSessionService.setSocketPlayerName.calledOnceWithExactly(socket, 'active-game-1', 'Alice')).to.equal(true);
        expect(
            activeGameGarbageCollectorService.reevaluateFinishedGameMark.calledOnceWithExactly('active-game-1') &&
                activeGameGarbageCollectorService.reevaluateFinishedGameMark.calledAfter(gameSessionService.setSocketPlayerName),
        ).to.equal(true);
    });

    it('ignores join when parsed active game id is missing', async () => {
        gameSessionService.parseJoinGamePayload.returns({ activeGameId: '', playerName: 'Alice' });
        service.register(socket, namespace);

        await handlers.get(SocketEvent.JoinGame)?.({ activeGameId: '', playerName: 'Alice' });

        expect((socket.join as sinon.SinonStub).called).to.equal(false);
        expect(activeGameGarbageCollectorService.reevaluateFinishedGameMark.called).to.equal(false);
    });

    it('joins game without assigning player name when payload has none', async () => {
        gameSessionService.parseJoinGamePayload.returns({ activeGameId: 'active-game-1' });
        service.register(socket, namespace);

        await handlers.get(SocketEvent.JoinGame)?.({ activeGameId: 'active-game-1' });

        expect((socket.join as sinon.SinonStub).calledOnceWithExactly('active-game-1')).to.equal(true);
        expect(gameSessionService.setSocketPlayerName.called).to.equal(false);
    });

    it('does not emit player list when active game has no players array', async () => {
        activeGameService.getActiveGameById.resolves({});
        service.register(socket, namespace);

        await handlers.get(SocketEvent.JoinGame)?.({ activeGameId: 'active-game-1', playerName: 'Alice' });

        expect((namespace.to as sinon.SinonStub).calledWith('active-game-1')).to.equal(false);
    });

    it('swallows active-game fetch errors during join flow', async () => {
        activeGameService.getActiveGameById.rejects(new Error('fetch failed'));
        service.register(socket, namespace);

        await handlers.get(SocketEvent.JoinGame)?.({ activeGameId: 'active-game-1', playerName: 'Alice' });

        expect(activeGameGarbageCollectorService.reevaluateFinishedGameMark.calledOnce).to.equal(true);
    });

    it('delegates player kick and waiting-room leave events to session service', async () => {
        const data = { gameId: 'active-game-1', playerName: 'Alice' };
        service.register(socket, namespace);

        await handlers.get(SocketEvent.PlayerKick)?.(data);
        await handlers.get(SocketEvent.LeaveWaitingRoom)?.(data);

        expect(gameSessionService.handlePlayerKick.calledOnceWithExactly(data, namespace)).to.equal(true);
        expect(gameSessionService.handleLeaveWaitingRoom.calledOnceWithExactly(data, namespace, socket)).to.equal(true);
    });

    it('delegates abandon and disconnect while preserving game-log callback', async () => {
        const data = { gameId: 'active-game-1', playerName: 'Alice' };
        service.register(socket, namespace);

        await handlers.get(SocketEvent.PlayerAbandon)?.(data);
        await handlers.get('disconnect')?.();

        const abandonEmitLog = gameSessionService.handlePlayerAbandon.getCall(0).args[3] as (gameId: string, message: string) => void;
        abandonEmitLog('active-game-1', 'abandon message');
        const disconnectEmitLog = gameSessionService.handleDisconnect.getCall(0).args[2] as (gameId: string, message: string) => void;
        disconnectEmitLog('active-game-1', 'disconnect message');

        expect(gameSessionService.handlePlayerAbandon.calledOnceWithExactly(data, namespace, socket, sinon.match.func)).to.equal(true);
        expect(gameSessionService.handleDisconnect.calledOnceWithExactly(socket, namespace, sinon.match.func)).to.equal(true);
        expect(gameplayLogService.emitGameLogToRoom.calledTwice).to.equal(true);
    });
});
