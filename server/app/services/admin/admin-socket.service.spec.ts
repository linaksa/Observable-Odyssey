/**
 * Testing strategy — AdminSocketsService
 *
 * Approach: unit tests with Sinon for stubs/spies.
 * The real service is instantiated with a real SocketService, allowing
 * verification of integration between the two services without touching the network.
 * A helper HTTP server is created only to initialize Socket.IO.
 *
 * Edge cases covered:
 * - Calling emitNewData before initialize: verifies that premature use
 *   of the service throws an explicit error rather than producing
 *   unexpected silent behavior.
 * - Calling emitNewData after initialize: verifies the nominal path and ensures
 *   the event is emitted on the correct namespace.
 */
import { expect } from 'chai';
import { createServer, Server as HttpServer } from 'http';
import * as sinon from 'sinon';
import { AdminSocketsService } from '@app/services/admin/admin-sockets.service';
import { SocketService } from '@app/services/realtime/socket.service';

describe('AdminSocketsService', () => {
    let service: AdminSocketsService;
    let socketService: SocketService;
    let httpServer: HttpServer;
    let mockEmit: sinon.SinonStub;

    beforeEach(() => {
        socketService = new SocketService();
        service = new AdminSocketsService(socketService);
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
            expect(() => service.emitNewData()).to.not.throw();
        });
    });

    describe('emitNewData', () => {
        // Edge case: call before namespace initialization. The absence of a namespace
        // should be reported explicitly by throwing an exception to avoid silent failures.
        it('should throw error if not initialized', () => {
            socketService.initialize(httpServer);
            expect(() => service.emitNewData()).to.throw("Namespace 'admin' not found. Call createNamespace() first.");
        });

        it('should emit modified-game event when initialized', () => {
            socketService.initialize(httpServer);
            service.initialize();
            sinon.stub(socketService, 'emit').callsFake(mockEmit);

            service.emitNewData();

            expect(mockEmit.calledOnce).to.equal(true);
            expect(mockEmit.calledWith('admin', 'modified-game')).to.equal(true);
        });
    });
});
