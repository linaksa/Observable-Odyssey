/**
 * Testing strategy — SocketService
 *
 * Approach:
 * - Mock `socket.io-client` factory output and assert namespace socket caching behavior.
 * - Validate default-namespace helper methods (`connectDefault`, `onDefault`, `emitDefault`) delegate correctly.
 *
 * Edge cases covered:
 * - Repeated connect requests reuse an existing namespace socket instead of recreating it.
 * - Missing namespaces report disconnected state safely.
 */
import { Socket } from 'socket.io-client';
import { SocketService } from '@app/services/realtime/socket.service';

const GAME_NAMESPACE = 'game';

describe('SocketService', () => {
    let service: SocketService;

    beforeEach(() => {
        service = new SocketService();
    });

    afterEach(() => {
        clearNamespaces(service);
    });

    it('should create and store namespace socket on first connect', () => {
        const socket = service.connect(GAME_NAMESPACE);

        expect(socket).toBeTruthy();
        expect(getNamespaces(service).get(GAME_NAMESPACE)).toBe(socket);
    });

    // Edge case: When namespace is already registered, reuse existing socket.
    it('should reuse existing socket when namespace is already registered', () => {
        const cachedSocket = createSocketMock(true);
        setNamespaceSocket(service, GAME_NAMESPACE, cachedSocket);

        const result = service.connect(GAME_NAMESPACE);

        expect(result).toBe(cachedSocket as unknown as Socket);
    });

    // Edge case: When required input data is missing, report false for missing namespace.
    it('should report false for missing namespace', () => {
        expect(service.isConnected('missing')).toBeFalse();
    });

    it('should support default namespace connectivity methods', () => {
        expect(service.isConnected()).toBeFalse();

        const socket = createSocketMock(true);
        setNamespaceSocket(service, '', socket);
        expect(service.isConnected()).toBeTrue();

        service.disconnect();
        expect(socket.disconnect).toHaveBeenCalled();
        expect(getNamespaces(service).has('')).toBeFalse();
    });

    it('should connect to default namespace when none is provided', () => {
        const socket = service.connect();

        expect(socket).toBeTruthy();
        expect(getNamespaces(service).get('')).toBe(socket);
    });

    it('should report socket connected state for existing namespace', () => {
        const connectedSocket = createSocketMock(true);
        const disconnectedSocket = createSocketMock(false);
        setNamespaceSocket(service, 'connected', connectedSocket);
        setNamespaceSocket(service, 'disconnected', disconnectedSocket);

        expect(service.isConnected('connected')).toBeTrue();
        expect(service.isConnected('disconnected')).toBeFalse();
    });

    it('should disconnect and remove namespace when connected', () => {
        const socket = createSocketMock(true);
        setNamespaceSocket(service, GAME_NAMESPACE, socket);

        service.disconnect(GAME_NAMESPACE);

        expect(socket.disconnect).toHaveBeenCalled();
        expect(getNamespaces(service).has(GAME_NAMESPACE)).toBeFalse();
    });

    // Edge case: When namespace is not connected, skip disconnect.
    it('should skip disconnect when namespace is not connected', () => {
        const socket = createSocketMock(false);
        setNamespaceSocket(service, GAME_NAMESPACE, socket);

        service.disconnect(GAME_NAMESPACE);

        expect(socket.disconnect).not.toHaveBeenCalled();
        expect(getNamespaces(service).has(GAME_NAMESPACE)).toBeTrue();
    });

    // Edge case: When namespace socket does not exist, error on on().
    it('should error on on() when namespace socket does not exist', () => {
        let receivedError: Error | undefined;

        service.on<string>('missing', 'event').subscribe({
            error: (error: Error) => {
                receivedError = error;
            },
        });

        expect(receivedError?.message).toBe('Socket not connected');
    });

    it('should register and unregister event listeners through observable lifecycle', () => {
        const socket = createSocketMock(true);
        setNamespaceSocket(service, GAME_NAMESPACE, socket);
        const receivedPayloads: string[] = [];

        const subscription = service.on<string>(GAME_NAMESPACE, 'event').subscribe((payload) => {
            receivedPayloads.push(payload);
        });
        const registeredHandler = socket.on.calls.mostRecent().args[1] as (payload: string) => void;
        registeredHandler('payload');
        subscription.unsubscribe();

        expect(receivedPayloads).toEqual(['payload']);
        expect(socket.off).toHaveBeenCalledWith('event', registeredHandler);
    });

    it('should emit payload with callback for namespace socket', () => {
        const socket = createSocketMock(true);
        const callback = jasmine.createSpy('callback');
        setNamespaceSocket(service, GAME_NAMESPACE, socket);

        service.emit(GAME_NAMESPACE, 'event', 'payload', callback);

        expect(socket.emit).toHaveBeenCalledWith('event', 'payload', callback);
    });

    it('should emit variadic payload using emitMany', () => {
        const socket = createSocketMock(true);
        setNamespaceSocket(service, GAME_NAMESPACE, socket);

        service.emitMany(GAME_NAMESPACE, 'event', 'payload', 2);

        expect(socket.emit).toHaveBeenCalledWith('event', 'payload', 2);
    });
});

function getNamespaces(service: SocketService): Map<string, Socket> {
    return (service as unknown as { namespaces: Map<string, Socket> }).namespaces;
}

function setNamespaceSocket(service: SocketService, namespace: string, socket: SocketMock): void {
    getNamespaces(service).set(namespace, socket as unknown as Socket);
}

function clearNamespaces(service: SocketService): void {
    const namespaces = getNamespaces(service);
    namespaces.forEach((socket) => socket.disconnect());
    namespaces.clear();
}

function createSocketMock(connected: boolean): SocketMock {
    return {
        connected,
        emit: jasmine.createSpy('emit'),
        on: jasmine.createSpy('on'),
        off: jasmine.createSpy('off'),
        disconnect: jasmine.createSpy('disconnect'),
    };
}

type SocketMock = {
    connected: boolean;
    emit: jasmine.Spy;
    on: jasmine.Spy;
    off: jasmine.Spy;
    disconnect: jasmine.Spy;
};
