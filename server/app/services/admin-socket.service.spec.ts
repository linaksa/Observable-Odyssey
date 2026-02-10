import { expect } from 'chai';
import { createServer, Server as HttpServer } from 'http';
import * as sinon from 'sinon';
import { AdminSocketsService } from './admin-sockets.service';

describe('AdminSocketsService', () => {
    let service: AdminSocketsService;
    let httpServer: HttpServer;
    let mockEmit: sinon.SinonStub;

    beforeEach(() => {
        service = new AdminSocketsService();
        httpServer = createServer();
        mockEmit = sinon.stub();
    });

    afterEach(() => {
        sinon.restore();
        httpServer.close();
    });

    describe('initialize', () => {
        it('should initialize socket.io server with correct config', () => {
            service.initialize(httpServer);
            expect(() => service.emitNewData()).to.not.throw();
        });
    });

    describe('emitNewData', () => {
        it('should throw error if not initialized', () => {
            expect(() => service.emitNewData()).to.throw('AdminSocketsService not initialized. Call initialize() first.');
        });

        it('should emit new-games event when initialized', () => {
            // ooof
            (service as unknown as { sio: { emit: sinon.SinonStub } }).sio = { emit: mockEmit };

            service.emitNewData();

            expect(mockEmit.calledOnce).to.equal(true);
            expect(mockEmit.calledWith('new-games')).to.equal(true);
        });
    });
});
