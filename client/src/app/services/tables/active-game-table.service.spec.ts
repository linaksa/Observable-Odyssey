/**
 * Testing strategy — Active Game Table Service
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
import { GameService } from '@app/services/admin/game.service';
import { IActiveGame } from '@common/active-game';
import { Subject } from 'rxjs/internal/Subject';
import { ActiveGameTableService } from './active-game-table.service';
import SpyObj = jasmine.SpyObj;

describe('ActiveGameTableService', () => {
    let service: ActiveGameTableService;
    let gameServiceSpy: SpyObj<GameService>;

    beforeEach(() => {
        gameServiceSpy = jasmine.createSpyObj('GameService', ['fetchJoinableActiveGames']);

        TestBed.configureTestingModule({
            providers: [ActiveGameTableService, { provide: GameService, useValue: gameServiceSpy }],
        });

        service = TestBed.inject(ActiveGameTableService);
    });

    it('should call GameService.fetchJoinableActiveGames', () => {
        // Nominal fetch case
        // The isLoading flag must be set to true during the fetch, then to false at the end of the fetch

        const subject = new Subject<IActiveGame[]>();
        gameServiceSpy.fetchJoinableActiveGames.and.returnValue(subject.asObservable());

        service.fetchJoinableActiveGames();

        expect(gameServiceSpy.fetchJoinableActiveGames).toHaveBeenCalled();
        expect(service.isLoading()).toBeTrue();

        subject.complete();
        expect(service.isLoading()).toBeFalse();
    });

    it('should update tableData when games are received', () => {
        const subject = new Subject<IActiveGame[]>();
        gameServiceSpy.fetchJoinableActiveGames.and.returnValue(subject.asObservable());

        const games = [{ id: '1' }] as unknown as IActiveGame[];

        service.fetchJoinableActiveGames();
        subject.next(games);

        expect(service.tableData).toEqual(games);
    });

    it('should clear loading flag when fetch errors', () => {
        const subject = new Subject<IActiveGame[]>();
        gameServiceSpy.fetchJoinableActiveGames.and.returnValue(subject.asObservable());

        service.fetchJoinableActiveGames();
        subject.error(new Error('network error'));

        expect(service.isLoading()).toBeFalse();
    });

    // Edge case: When null is received, set tableData to empty array.
    it('should set tableData to empty array when null is received', () => {
        // Edge case
        // Handle the case where the request fails
        const subject = new Subject<IActiveGame[] | null>();
        gameServiceSpy.fetchJoinableActiveGames.and.returnValue(subject.asObservable() as Subject<IActiveGame[]>);

        service.fetchJoinableActiveGames();
        subject.next(null);

        expect(service.tableData).toEqual([]);
    });

    it('should unsubscribe from current fetch on destroy', () => {
        const unsubscribeSpy = jasmine.createSpy('unsubscribe');
        Object.assign(service as unknown as Record<string, unknown>, {
            gameServiceSubscription: { unsubscribe: unsubscribeSpy },
        });

        service.ngOnDestroy();

        expect(unsubscribeSpy).toHaveBeenCalled();
    });
});
