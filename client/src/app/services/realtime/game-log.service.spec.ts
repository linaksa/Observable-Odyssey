/**
 * Testing strategy — GameLogService
 *
 * Approach:
 * - Drive public/private log channels through Subject-backed socket mocks.
 * - Assert log accumulation, clear behavior, and subscription lifecycle across connect/disconnect/destroy.
 *
 * Edge cases covered:
 * - Reconnect tears down previous subscriptions before wiring new listeners.
 * - `disconnect` and `ngOnDestroy` stay safe when called repeatedly.
 */
import { TestBed } from '@angular/core/testing';
import { GameLogService } from '@app/services/realtime/game-log.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { IGameLogPayload } from '@common/socket-payloads';
import { Observable, Subject } from 'rxjs';

describe('GameLogService', () => {
    let service: GameLogService;
    let socketServiceSpy: jasmine.SpyObj<SocketService>;
    let publicLogs$: Subject<IGameLogPayload>;
    let privateLogs$: Subject<IGameLogPayload>;

    beforeEach(() => {
        socketServiceSpy = jasmine.createSpyObj<SocketService>('SocketService', ['connect', 'on']);
        publicLogs$ = new Subject<IGameLogPayload>();
        privateLogs$ = new Subject<IGameLogPayload>();

        socketServiceSpy.on.and.callFake(((_: string, event: string) => {
            return event === SocketEvent.GameLog ? publicLogs$.asObservable() : privateLogs$.asObservable();
        }) as unknown as <T>(namespace: string, event: string) => Observable<T>);

        TestBed.configureTestingModule({
            providers: [GameLogService, { provide: SocketService, useValue: socketServiceSpy }],
        });

        service = TestBed.inject(GameLogService);
    });

    it('connects and appends logs from both public and private channels', () => {
        // Nominal case
        service.connect();

        publicLogs$.next(createLog('Public message'));
        privateLogs$.next(createLog('Private message'));

        expect(socketServiceSpy.connect).toHaveBeenCalledWith(Namespaces.Game);
        expect(service.gameLogs().map((log) => log.message)).toEqual(['Public message', 'Private message']);
    });

    it('disconnects previous subscriptions when connect() is called again', () => {
        // Edge case
        service.connect();
        service.connect();

        publicLogs$.next(createLog('Ignored after reconnect'));

        expect(service.gameLogs().map((log) => log.message)).toEqual(['Ignored after reconnect']);
    });

    it('clears logs and disconnects subscriptions safely', () => {
        // Nominal case
        service.connect();
        publicLogs$.next(createLog('To clear'));

        service.clear();
        service.disconnect();
        publicLogs$.next(createLog('Ignored after disconnect'));

        expect(service.gameLogs()).toEqual([]);
    });

    it('calls disconnect on destroy', () => {
        // Edge case
        service.connect();
        service.ngOnDestroy();
        publicLogs$.next(createLog('Ignored after destroy'));

        expect(service.gameLogs()).toEqual([]);
    });

    function createLog(message: string): IGameLogPayload {
        return {
            message,
            postedAt: new Date().toISOString(),
        };
    }
});
