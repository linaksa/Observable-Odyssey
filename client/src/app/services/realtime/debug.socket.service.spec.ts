/**
 * Testing strategy — Debug Socket Service
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
import { IDebugToggleState } from '@common/socket-payloads';
import { Subject } from 'rxjs';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { DebugSocketService } from './debug.socket.service';
import { SocketService } from './socket.service';

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

    // Edge case: should unsubscribe old debug stream when connect is called again.
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

    // Edge case: should unsubscribe and disconnect on destroy.
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
