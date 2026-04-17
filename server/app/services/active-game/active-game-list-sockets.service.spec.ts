/**
 * Testing strategy — ActiveGameListSocketsService
 *
 * Approach:
 * - Initialize the shared SocketService against a real HTTP server and assert namespace-dependent behavior through public APIs.
 * - Verify event forwarding by stubbing SocketService.emit after namespace creation.
 *
 * Edge cases covered:
 * - Emitting before initialize() throws the expected missing-namespace error.
 */
import { ActiveGameListSocketsService } from '@app/services/active-game/active-game-list-sockets.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { expect } from 'chai';
import { createServer, Server as HttpServer } from 'http';
import * as sinon from 'sinon';

describe('ActiveGameListSocketsService', () => {
    let service: ActiveGameListSocketsService;
    let socketService: SocketService;
    let httpServer: HttpServer;
    let mockEmit: sinon.SinonStub;

    beforeEach(() => {
        socketService = new SocketService();
        service = new ActiveGameListSocketsService(socketService);
        httpServer = createServer();
        mockEmit = sinon.stub();
    });

    afterEach(() => {
        sinon.restore();
        socketService.close();
        httpServer.close();
    });

    describe('initialize', () => {
        it('should create admin namespace with correct path', () => {
            socketService.initialize(httpServer);
            service.initialize();
            expect(() => service.emitJoinableGamesUpdated('test-id')).to.not.throw();
        });
    });

    describe('emitJoinableGamesUpdated', () => {
        // The admin namespace must exist before broadcasting joinable-game updates.
        it('should throw error if not initialized', () => {
            socketService.initialize(httpServer);
            expect(() => service.emitJoinableGamesUpdated('test-id')).to.throw(
                "Namespace 'active-game-admin' not found. Call createNamespace() first.",
            );
        });

        it('should emit joinable-games-updated event when initialized', () => {
            socketService.initialize(httpServer);
            service.initialize();
            sinon.stub(socketService, 'emit').callsFake(mockEmit);

            service.emitJoinableGamesUpdated('test-id');

            expect(mockEmit.calledOnce).to.equal(true);
            expect(mockEmit.calledWith('active-game-admin', 'joinable-games-updated')).to.equal(true);
        });
    });
});
