/**
 * Testing strategy — DebugSocketService
 *
 * Approach:
 * - Mock SocketService and verify connection plus subscription setup to debug-state events.
 * - Assert emitted toggle payloads and cleanup behavior across reconnect and destroy flows.
 *
 * Edge cases covered:
 * - Repeated `connect` calls unsubscribe prior streams to avoid duplicate handlers.
 * - Destroy reliably disconnects namespace subscriptions even after multiple reconnects.
 */
import { TestBed } from '@angular/core/testing';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { IDebugToggleState } from '@common/socket-payloads';
import { Subject } from 'rxjs';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { DebugSocketService } from '@app/services/realtime/debug.socket.service';
import { SocketService } from '@app/services/realtime/socket.service';

describe('DebugSocketService', () => {
    let service: DebugSocketService;
    let socketServiceSpy: jasmine.SpyObj<SocketService>;
    let activeGameServiceSpy: jasmine.SpyObj<ActiveGameService>;

    beforeEach(() => {
        socketServiceSpy = jasmine.createSpyObj<SocketService>('SocketService', ['isConnected', 'connect', 'on', 'emitMany', 'disconnect']);
        activeGameServiceSpy = jasmine.createSpyObj<ActiveGameService>('ActiveGameService', ['applyDebugModeState']);

        TestBed.configureTestingModule({
            providers: [
                DebugSocketService,
                { provide: SocketService, useValue: socketServiceSpy },
                { provide: ActiveGameService, useValue: activeGameServiceSpy },
            ],
        });
        service = TestBed.inject(DebugSocketService);
    });

    it('should connect game namespace and apply incoming debug states', () => {
        const debugToggle$ = new Subject<IDebugToggleState>();
        const toggleState = { playerName: 'Organizer', isDebugMode: true };
        socketServiceSpy.isConnected.and.returnValue(false);
        socketServiceSpy.on.and.returnValue(debugToggle$.asObservable());

        service.connect();
        debugToggle$.next(toggleState);

        expect(socketServiceSpy.connect).toHaveBeenCalledWith(Namespaces.Game);
        expect(socketServiceSpy.on).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.DebugToggle);
        expect(activeGameServiceSpy.applyDebugModeState).toHaveBeenCalledWith(toggleState);
    });

    // Edge case: When connect is called again, unsubscribe old debug stream.
    it('should unsubscribe old debug stream when connect is called again', () => {
        const firstToggle$ = new Subject<IDebugToggleState>();
        const secondToggle$ = new Subject<IDebugToggleState>();
        const toggleState = { playerName: 'Organizer', isDebugMode: false };
        socketServiceSpy.isConnected.and.returnValue(true);
        socketServiceSpy.on.and.returnValues(firstToggle$.asObservable(), secondToggle$.asObservable());

        service.connect();
        service.connect();
        activeGameServiceSpy.applyDebugModeState.calls.reset();

        firstToggle$.next(toggleState);
        secondToggle$.next(toggleState);

        expect(activeGameServiceSpy.applyDebugModeState).toHaveBeenCalledTimes(1);
        expect(activeGameServiceSpy.applyDebugModeState).toHaveBeenCalledWith(toggleState);
    });

    it('should emit debug toggle payload with player and game id', () => {
        service.emitDebugModeToggle('Alice', 'active-game-1');

        expect(socketServiceSpy.emitMany).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.DebugToggle, 'Alice', 'active-game-1');
    });

    // Edge case: When the debug socket service is destroyed, it should unsubscribe and disconnect cleanly.
    it('should unsubscribe and disconnect on destroy', () => {
        const debugToggle$ = new Subject<IDebugToggleState>();
        const toggleState = { playerName: 'Organizer', isDebugMode: true };
        socketServiceSpy.isConnected.and.returnValue(true);
        socketServiceSpy.on.and.returnValue(debugToggle$.asObservable());
        service.connect();

        activeGameServiceSpy.applyDebugModeState.calls.reset();
        service.ngOnDestroy();
        debugToggle$.next(toggleState);

        expect(socketServiceSpy.disconnect).toHaveBeenCalledWith(Namespaces.Game);
        expect(activeGameServiceSpy.applyDebugModeState).not.toHaveBeenCalled();
    });
});
