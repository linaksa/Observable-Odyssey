/**
 * Testing strategy — Game End Component
 *
 * Approach:
 * - Feed route params with a Subject and assert data loading side effects.
 * - Validate lifecycle cleanup by checking route subscription teardown.
 *
 * Edge cases covered:
 * - Missing activeGameId should not trigger service requests.
 * - Destroy before init should remain safe.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { GameService } from '@app/services/admin/game.service';
import { IActiveGame } from '@common/active-game';
import { Subject, of } from 'rxjs';
import { GameEndComponent } from './game-end.component';

describe('GameEndComponent', () => {
    let component: GameEndComponent;
    let fixture: ComponentFixture<GameEndComponent>;
    let routeParams$: Subject<{ activeGameId?: string }>;
    let gameServiceSpy: jasmine.SpyObj<GameService>;

    beforeEach(async () => {
        routeParams$ = new Subject<{ activeGameId?: string }>();
        gameServiceSpy = jasmine.createSpyObj<GameService>('GameService', ['getActiveGameById']);

        TestBed.overrideComponent(GameEndComponent, { set: { template: '' } });

        await TestBed.configureTestingModule({
            imports: [GameEndComponent],
            providers: [
                { provide: ActivatedRoute, useValue: { params: routeParams$.asObservable() } },
                { provide: GameService, useValue: gameServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameEndComponent);
        component = fixture.componentInstance;
    });

    it('should load active game when route provides activeGameId', () => {
        const activeGame = { _id: 'game-1' } as IActiveGame;
        gameServiceSpy.getActiveGameById.and.returnValue(of(activeGame));

        component.ngOnInit();

        // Nominal case: id exists and data is fetched.
        routeParams$.next({ activeGameId: 'game-1' });
        expect(gameServiceSpy.getActiveGameById).toHaveBeenCalledWith('game-1');
        expect(component.activeGame).toBe(activeGame);

        // Edge case: no id means no request.
        gameServiceSpy.getActiveGameById.calls.reset();
        routeParams$.next({});
        expect(gameServiceSpy.getActiveGameById).not.toHaveBeenCalled();
    });

    it('should safely handle destroy with or without route subscription', () => {
        expect(() => component.ngOnDestroy()).not.toThrow();

        component.ngOnInit();
        const routeSubscription = (component as unknown as { routeSubscription: { unsubscribe: () => void } }).routeSubscription;
        const unsubscribeSpy = spyOn(routeSubscription, 'unsubscribe').and.callThrough();

        component.ngOnDestroy();
        expect(unsubscribeSpy).toHaveBeenCalled();
    });
});
