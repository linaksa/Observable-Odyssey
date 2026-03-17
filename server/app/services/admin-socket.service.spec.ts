/**
 * Stratégie de test – AdminSocketsService
 *
 * Approche : tests unitaires avec Sinon pour les stubs/spies.
 * Le service réel est instancié avec un SocketService réel, ce qui permet de
 * vérifier l'intégration entre les deux services sans toucher au réseau.
 * Un serveur HTTP utilitaire est créé uniquement pour initialiser Socket.IO.
 *
 * Cas limites couverts :
 * - Appel à emitNewData avant initialize : vérifie que l'utilisation prématurée
 *   du service lève une erreur explicite plutôt que de produire un comportement
 *   silencieux inattendu.
 * - Appel à emitNewData après initialize : vérifie le chemin nominal et s'assure
 *   que l'évènement est bien transmis via le bon namespace.
 */
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
        // Cas limite : appel avant initialisation du namespace. L'absence de namespace
        // doit être signalée explicitement par une exception pour éviter un comportement silencieux.
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
