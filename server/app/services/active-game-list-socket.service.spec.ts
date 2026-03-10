import { IActiveGame } from '@common/activeGame';
import { expect } from 'chai';
import { createServer, Server as HttpServer } from 'http';
import * as sinon from 'sinon';
import { ActiveGameListSocketsService } from './active-game-list-sockets.service';
import { SocketService } from './socket.service';

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
            expect(() => service.emitJoinableGamesUpdated({} as IActiveGame)).to.not.throw();
        });
    });

    describe('emitJoinableGamesUpdated', () => {
        it('should throw error if not initialized', () => {
            socketService.initialize(httpServer);
            expect(() => service.emitJoinableGamesUpdated({} as IActiveGame)).to.throw(
                "Namespace 'active-game-admin' not found. Call createNamespace() first.",
            );
        });

        it('should emit joinable-games-updated event when initialized', () => {
            socketService.initialize(httpServer);
            service.initialize();
            sinon.stub(socketService, 'emit').callsFake(mockEmit);

            service.emitJoinableGamesUpdated({} as IActiveGame);

            expect(mockEmit.calledOnce).to.equal(true);
            expect(mockEmit.calledWith('active-game-admin', 'joinable-games-updated')).to.equal(true);
        });
    });
});
