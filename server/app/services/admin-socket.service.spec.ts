import { expect } from 'chai';
import { createServer, Server as HttpServer } from 'http';
import * as sinon from 'sinon';
import { AdminSocketsService } from './admin-sockets.service';
import { SocketService } from './socket.service';

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
