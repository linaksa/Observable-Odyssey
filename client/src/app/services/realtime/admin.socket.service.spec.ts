/**
 * Testing strategy — AdminSocketService
 *
 * Approach:
 * - Mock SocketService and validate namespace connection reference-count behavior.
 * - Assert lifecycle methods (`connect`, `disconnect`, `listenToGameModifications`, `ngOnDestroy`) orchestrate socket usage.
 *
 * Edge cases covered:
 * - Repeated connect calls do not recreate an already-connected namespace socket.
 * - Disconnect remains idempotent and only tears down when the last consumer leaves.
 */
import { TestBed } from '@angular/core/testing';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Subject } from 'rxjs';
import { AdminSocketService } from '@app/services/realtime/admin.socket.service';
import { SocketService } from '@app/services/realtime/socket.service';

describe('AdminSocketService', () => {
    let service: AdminSocketService;
    let socketServiceSpy: jasmine.SpyObj<SocketService>;

    beforeEach(() => {
        socketServiceSpy = jasmine.createSpyObj<SocketService>('SocketService', ['isConnected', 'connect', 'disconnect', 'on']);
        socketServiceSpy.on.and.returnValue(new Subject<void>().asObservable());

        TestBed.configureTestingModule({
            providers: [AdminSocketService, { provide: SocketService, useValue: socketServiceSpy }],
        });
        service = TestBed.inject(AdminSocketService);
    });

    // Edge case: When not connected, connect admin namespace.
    it('should connect admin namespace when not connected', () => {
        socketServiceSpy.isConnected.and.returnValue(false);

        service.connect();

        expect(socketServiceSpy.connect).toHaveBeenCalledWith(Namespaces.Admin);
    });

    // Edge case: When already connected, it should not reconnect namespace.
    it('should not reconnect namespace when already connected', () => {
        socketServiceSpy.isConnected.and.returnValue(true);

        service.connect();

        expect(socketServiceSpy.connect).not.toHaveBeenCalled();
    });

    it('should disconnect only when last consumer disconnects', () => {
        socketServiceSpy.isConnected.and.returnValue(true);

        service.connect();
        service.connect();
        service.disconnect();

        expect(socketServiceSpy.disconnect).not.toHaveBeenCalled();

        service.disconnect();

        expect(socketServiceSpy.disconnect).toHaveBeenCalledOnceWith(Namespaces.Admin);
    });

    // Edge case: When no connection exists, keep disconnect idempotent.
    it('should keep disconnect idempotent when no connection exists', () => {
        socketServiceSpy.isConnected.and.returnValue(false);

        service.disconnect();

        expect(socketServiceSpy.disconnect).not.toHaveBeenCalled();
    });

    it('should ensure connection and listen to game modifications', () => {
        const modified$ = new Subject<void>();
        const receivedEvents: boolean[] = [];
        socketServiceSpy.isConnected.and.returnValue(false);
        socketServiceSpy.on.and.returnValue(modified$.asObservable());

        const subscription = service.onGamesModified().subscribe(() => {
            receivedEvents.push(true);
        });

        modified$.next();

        expect(socketServiceSpy.connect).toHaveBeenCalledWith(Namespaces.Admin);
        expect(socketServiceSpy.on).toHaveBeenCalledWith(Namespaces.Admin, SocketEvent.GameModified);
        expect(receivedEvents.length).toBe(1);
        subscription.unsubscribe();
    });

    // Edge case: When the admin socket service is destroyed, the admin namespace should be disconnected.
    it('should disconnect admin namespace on destroy', () => {
        service.ngOnDestroy();

        expect(socketServiceSpy.disconnect).toHaveBeenCalledWith(Namespaces.Admin);
    });
});
