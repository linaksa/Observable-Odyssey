import { Server as HttpServer } from 'http';
import { Server as IOServer, Namespace, ServerOptions } from 'socket.io';
import { Service } from 'typedi';

@Service()
export class SocketService {
    private ioServer: IOServer | null = null;
    private namespaces: Map<string, Namespace> = new Map();

    initialize(httpServer: HttpServer, options: Partial<ServerOptions> = {}): void {
        if (this.ioServer) {
            throw new Error('Socket.IO server already initialized');
        }

        this.ioServer = new IOServer(httpServer, {
            transports: ['websocket'],
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
            path: '/ws',
            ...options,
        });
    }

    createNamespace(name: string): Namespace {
        if (!this.ioServer) {
            throw new Error('Socket.IO server not initialized. Call initialize() first.');
        }

        if (this.namespaces.has(name)) {
            return this.namespaces.get(name);
        }

        const namespace = this.ioServer.of(name);
        this.namespaces.set(name, namespace);
        return namespace;
    }

    getNamespace(name: string): Namespace {
        const namespace = this.namespaces.get(name);
        if (!namespace) {
            throw new Error(`Namespace '${name}' not found. Call createNamespace() first.`);
        }
        return namespace;
    }

    hasNamespace(name: string): boolean {
        return this.namespaces.has(name);
    }

    emit(name: string, event: string, data?: unknown): void {
        const namespace = this.getNamespace(name);
        namespace.emit(event, data);
    }

    getServer(): IOServer {
        if (!this.ioServer) {
            throw new Error('Socket.IO server not initialized. Call initialize() first.');
        }
        return this.ioServer;
    }

    close(): void {
        if (this.ioServer) {
            this.ioServer.close();
            this.ioServer = null;
            this.namespaces.clear();
        }
    }
}
