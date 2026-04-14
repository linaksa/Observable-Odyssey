/**
 * Testing strategy — Server periodic active-game sweep wiring
 *
 * Approach:
 * - Stub HTTP server creation and all TypeDI-resolved services to isolate bootstrap wiring.
 * - Capture the registered interval callback and invoke it directly to verify sweep behavior.
 *
 * Edge cases covered:
 * - Sweep failures are caught and logged via the server logging path.
 */
import { Application } from '@app/app';
import { ACTIVE_GAME_SWEEP_GRACE_PERIOD_MS, ACTIVE_GAME_SWEEP_INTERVAL_MS } from '@app/constants/active-game-garbage-collection';
import { Server } from '@app/server';
import { ActiveGameGarbageCollectorService } from '@app/services/active-game/active-game-garbage-collector.service';
import { ActiveGameListSocketsService } from '@app/services/active-game/active-game-list-sockets.service';
import { AdminSocketsService } from '@app/services/admin/admin-sockets.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { GameSocketsService } from '@app/services/realtime/game-sockets.service';
import { GameplayRealtimeFlowService } from '@app/services/realtime/gameplay-realtime-flow.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Container } from 'typedi';

describe('Server', () => {
    let server: Server;
    let fakeHttpServer: {
        listen: sinon.SinonStub;
        on: sinon.SinonStub;
    };
    let setIntervalStub: sinon.SinonStub;
    let containerGetStub: sinon.SinonStub;
    let socketService: { initialize: sinon.SinonStub };
    let adminSocketsService: { initialize: sinon.SinonStub };
    let gameSocketsService: { initialize: sinon.SinonStub };
    let activeGameListSocketsService: { initialize: sinon.SinonStub };
    let turnService: { setVirtualPlayerTurnHandler: sinon.SinonStub; setTurnEndedHandler: sinon.SinonStub };
    let virtualPlayerService: { startTurn: sinon.SinonStub };
    let gameplayRealtimeFlowService: { clearPendingFlagRequest: sinon.SinonStub };
    let activeGameGarbageCollectorService: { sweepMarkedGames: sinon.SinonStub };

    beforeEach(() => {
        socketService = { initialize: sinon.stub() };
        adminSocketsService = { initialize: sinon.stub() };
        gameSocketsService = { initialize: sinon.stub() };
        activeGameListSocketsService = { initialize: sinon.stub() };
        turnService = { setVirtualPlayerTurnHandler: sinon.stub(), setTurnEndedHandler: sinon.stub() };
        virtualPlayerService = { startTurn: sinon.stub() };
        gameplayRealtimeFlowService = { clearPendingFlagRequest: sinon.stub() };
        activeGameGarbageCollectorService = { sweepMarkedGames: sinon.stub().resolves(0) };

        fakeHttpServer = {
            listen: sinon.stub(),
            on: sinon.stub(),
        };

        const application = {
            app: {
                set: sinon.stub(),
            },
        } as unknown as Application;
        server = new Server(application);

        sinon.stub(server as unknown as { createHttpServer: () => unknown }, 'createHttpServer').returns(fakeHttpServer);
        setIntervalStub = sinon.stub(globalThis, 'setInterval').returns({} as NodeJS.Timeout);
        containerGetStub = sinon.stub(Container, 'get').callsFake((serviceToken: unknown) => {
            switch (serviceToken) {
                case SocketService:
                    return socketService;
                case AdminSocketsService:
                    return adminSocketsService;
                case GameSocketsService:
                    return gameSocketsService;
                case ActiveGameListSocketsService:
                    return activeGameListSocketsService;
                case TurnService:
                    return turnService;
                case VirtualPlayerService:
                    return virtualPlayerService;
                case GameplayRealtimeFlowService:
                    return gameplayRealtimeFlowService;
                case ActiveGameGarbageCollectorService:
                    return activeGameGarbageCollectorService;
                default:
                    throw new Error(`Unsupported service token: ${(serviceToken as { name?: string }).name ?? 'unknown'}`);
            }
        });
    });

    afterEach(() => {
        sinon.restore();
    });

    it('registers periodic sweep and invokes it with configured grace period', async () => {
        // Nominal case
        server.init();
        const sweepCallback = setIntervalStub.firstCall.args[0] as () => void;

        sweepCallback();
        await Promise.resolve();

        expect(containerGetStub.calledWithExactly(ActiveGameGarbageCollectorService)).to.equal(true);
        expect(setIntervalStub.calledOnce).to.equal(true);
        expect(setIntervalStub.firstCall.args[1]).to.equal(ACTIVE_GAME_SWEEP_INTERVAL_MS);
        expect(activeGameGarbageCollectorService.sweepMarkedGames.calledOnceWithExactly(ACTIVE_GAME_SWEEP_GRACE_PERIOD_MS)).to.equal(true);
    });

    it('swallows periodic sweep failures', async () => {
        // Edge case
        activeGameGarbageCollectorService.sweepMarkedGames.rejects(new Error('sweep failed'));
        server.init();

        const sweepCallback = setIntervalStub.firstCall.args[0] as () => void;
        sweepCallback();
        await Promise.resolve();

        expect(activeGameGarbageCollectorService.sweepMarkedGames.calledOnceWithExactly(ACTIVE_GAME_SWEEP_GRACE_PERIOD_MS)).to.equal(true);
    });
});
