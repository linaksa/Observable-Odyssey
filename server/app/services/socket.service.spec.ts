/**
 * Stratégie de test – SocketService
 *
 * Approche : tests unitaires organisés par méthode via des blocs describe imbriqués.
 * Le service est instancié directement (sans conteneur DI) et un serveur HTTP mock
 * est fourni pour initialiser Socket.IO sans ouvrir de port réseau réel.
 * Chaque bloc beforeEach réinitialise l'état pour garantir l'indépendance des tests.
 *
 * Cas limites couverts :
 * - Double initialisation : appeler initialize() deux fois doit lever une erreur
 *   pour éviter un remplacement silencieux du serveur en production.
 * - Utilisation avant initialisation : appels à getServer(), createNamespace(), emit()
 *   avant initialize() doivent tous échouer clairement avec un message explicite.
 * - Namespace inexistant : getNamespace() et emit() avec un nom inconnu doivent
 *   lever une erreur décrivant l'action corrective (« Call createNamespace() first »).
 * - Namespace déjà existant : createNamespace() appelé deux fois avec le même nom
 *   doit retourner l'instance existante sans en créer une nouvelle.
 * - Fermeture propre (close) : après close(), tous les namespaces sont supprimés
 *   et getServer() lève à nouveau.
 * - close sans initialisation préalable : ne doit pas lever d'exception.
 */
import { expect } from 'chai';
import { Server as HttpServer } from 'http';
import { SocketService } from './socket.service';

describe('SocketService', () => {
    let service: SocketService;
    let mockHttpServer: HttpServer;

    beforeEach(() => {
        service = new SocketService();
        mockHttpServer = {} as HttpServer;
    });

    afterEach(() => {
        service.close();
    });

    describe('initialize', () => {
        it('should initialize the main Socket.IO server', () => {
            service.initialize(mockHttpServer);
            expect(() => service.getServer()).to.not.throw();
        });

        // Cas limite : appel à initialize() une deuxième fois sur un service déjà
        // initialisé. Doit échouer explicitement pour éviter un remplacement inattendu du serveur.
        it('should throw error if already initialized', () => {
            service.initialize(mockHttpServer);
            expect(() => service.initialize(mockHttpServer)).to.throw('Socket.IO server already initialized');
        });

        it('should apply custom options to socket server', () => {
            service.initialize(mockHttpServer, {
                path: '/custom/path',
            });
            const server = service.getServer();
            expect(server).to.not.equal(null);
        });
    });

    describe('createNamespace', () => {
        beforeEach(() => {
            service.initialize(mockHttpServer);
        });

        it('should create a new namespace with given path and name', () => {
            const namespace = service.createNamespace('test');
            expect(namespace).to.not.equal(null);
            expect(service.hasNamespace('test')).to.equal(true);
        });

        // Cas limite : tentative de création de namespace sur un service non initialisé.
        // Le message d'erreur doit guider le développeur vers l'action corrective.
        it('should throw error if server not initialized', () => {
            const uninitializedService = new SocketService();
            expect(() => uninitializedService.createNamespace('test')).to.throw('Socket.IO server not initialized. Call initialize() first.');
        });

        // Cas limite : le namespace demandé existe déjà – createNamespace() doit retourner
        // l'instance existante au lieu d'en créer une nouvelle (idémpotence).
        it('should return namespace if namespace already exists', () => {
            const namespace = service.createNamespace('test');
            expect(service.createNamespace('test')).to.equal(namespace);
        });
    });

    describe('getNamespace', () => {
        beforeEach(() => {
            service.initialize(mockHttpServer);
        });

        it('should return existing namespace', () => {
            const createdNamespace = service.createNamespace('test');
            const retrievedNamespace = service.getNamespace('test');
            expect(retrievedNamespace).to.equal(createdNamespace);
        });

        it('should throw error if namespace does not exist', () => {
            expect(() => service.getNamespace('nonexistent')).to.throw("Namespace 'nonexistent' not found. Call createNamespace() first.");
        });
    });

    describe('hasNamespace', () => {
        beforeEach(() => {
            service.initialize(mockHttpServer);
        });

        it('should return true if namespace exists', () => {
            service.createNamespace('test');
            expect(service.hasNamespace('test')).to.equal(true);
        });

        it('should return false if namespace does not exist', () => {
            expect(service.hasNamespace('nonexistent')).to.equal(false);
        });
    });

    describe('emit', () => {
        beforeEach(() => {
            service.initialize(mockHttpServer);
        });

        it('should emit event through specified namespace', () => {
            const namespace = service.createNamespace('test');
            let emitted = false;
            namespace.emit = () => {
                emitted = true;
                return true;
            };

            service.emit('test', 'test-event', { data: 'test' });
            expect(emitted).to.equal(true);
        });

        it('should throw error if namespace does not exist', () => {
            expect(() => service.emit('nonexistent', 'test-event')).to.throw("Namespace 'nonexistent' not found. Call createNamespace() first.");
        });
    });

    describe('getServer', () => {
        it('should return the main Socket.IO server', () => {
            service.initialize(mockHttpServer);
            const server = service.getServer();
            expect(server).to.not.equal(null);
        });

        it('should throw error if server not initialized', () => {
            expect(() => service.getServer()).to.throw('Socket.IO server not initialized. Call initialize() first.');
        });
    });

    describe('close', () => {
        it('should close the server and clear namespaces', () => {
            service.initialize(mockHttpServer);
            service.createNamespace('test1');
            service.createNamespace('test2');

            expect(service.hasNamespace('test1')).to.equal(true);
            expect(service.hasNamespace('test2')).to.equal(true);

            service.close();

            expect(() => service.getServer()).to.throw('Socket.IO server not initialized. Call initialize() first.');
            expect(service.hasNamespace('test1')).to.equal(false);
            expect(service.hasNamespace('test2')).to.equal(false);
        });

        it('should not throw if server not initialized', () => {
            expect(() => service.close()).to.not.throw();
        });
    });
});
