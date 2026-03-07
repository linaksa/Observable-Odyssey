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

        it('should throw error if server not initialized', () => {
            const uninitializedService = new SocketService();
            expect(() => uninitializedService.createNamespace('test')).to.throw('Socket.IO server not initialized. Call initialize() first.');
        });

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
