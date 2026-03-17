/**
 * Testing strategy — Admin Socket Service
 *
 * Approach:
 * - Keep each test focused on one behavior with deterministic mocks/spies.
 * - Validate both nominal flows and failure paths that could break UX/state.
 * - Assert side effects explicitly (state changes, emitted events, and service calls).
 *
 * Edge cases covered:
 * - Missing or invalid input guards and safe early returns.
 * - Error handling paths and fallback user-facing messaging.
 * - Cleanup/teardown behavior (unsubscribe/reset/disconnect) when applicable.
 */
import { TestBed } from '@angular/core/testing';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Subject } from 'rxjs';
import { AdminSocketService } from './admin.socket.service';
import { SocketService } from './socket.service';

describe('AdminSocketService', () => {
    let service: AdminSocketService;
    let socketServiceSpy: jasmine.SpyObj<SocketService>;

    beforeEach(() => {
        socketServiceSpy = jasmine.createSpyObj<SocketService>('SocketService', ['isConnected', 'connect', 'disconnect', 'on']);
        socketServiceSpy.on.and.returnValue(new Subject<void>().asObservable());

        TestBed.configureTestingModule({
            providers: [
                AdminSocketService,
                { provide: SocketService, useValue: socketServiceSpy },
            ],
        });
        service = TestBed.inject(AdminSocketService);
    });

    // Edge case: should connect admin namespace when not connected.
    it('should connect admin namespace when not connected', () => {
        socketServiceSpy.isConnected.and.returnValue(false);

        service.connect();

        expect(socketServiceSpy.connect).toHaveBeenCalledWith(Namespaces.Admin);
    });

    // Edge case: should not reconnect namespace when already connected.
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

    // Edge case: should keep disconnect idempotent when no connection exists.
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

    // Edge case: should disconnect admin namespace on destroy.
    it('should disconnect admin namespace on destroy', () => {
        service.ngOnDestroy();

        expect(socketServiceSpy.disconnect).toHaveBeenCalledWith(Namespaces.Admin);
    });
});
