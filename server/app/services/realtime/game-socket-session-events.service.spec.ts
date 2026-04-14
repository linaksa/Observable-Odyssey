/**
 * Testing strategy — GameSocketSessionEventsService
 *
 * - Verify join flow triggers GC mark reevaluation after socket join/player registration.
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
    let socket: Socket;
    let namespace: Namespace;
    let joinHandler: ((payload: string | { activeGameId: string; playerName?: string }) => Promise<void>) | undefined;

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

        socket = {
            on: sinon.stub().callsFake((event: string, handler: (payload?: string) => Promise<void>) => {
                if (event === SocketEvent.JoinGame) {
                    joinHandler = handler as never;
                }
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
            { emitGameLogToRoom: sinon.stub() } as unknown as GameplayLogService,
            activeGameGarbageCollectorService as unknown as ActiveGameGarbageCollectorService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('reevaluates GC mark after joining a game and registering player name', async () => {
        service.register(socket, namespace);

        await joinHandler?.({ activeGameId: 'active-game-1', playerName: 'Alice' });

        expect((socket.join as sinon.SinonStub).calledOnceWithExactly('active-game-1')).to.equal(true);
        expect(gameSessionService.setSocketPlayerName.calledOnceWithExactly(socket, 'active-game-1', 'Alice')).to.equal(true);
        expect(
            activeGameGarbageCollectorService.reevaluateFinishedGameMark.calledOnceWithExactly('active-game-1') &&
                activeGameGarbageCollectorService.reevaluateFinishedGameMark.calledAfter(gameSessionService.setSocketPlayerName),
        ).to.equal(true);
    });
});
