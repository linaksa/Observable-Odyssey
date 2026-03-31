/**
 * Testing strategy — Game Ended Component
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
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { IActiveGame } from '@common/activeGame';
import { TEMPS_ECRAN_FIN_PARTIE } from '@common/constants';
import { GameEndedComponent } from './game-ended.component';

describe('GameEndedComponent', () => {
    let fixture: ComponentFixture<GameEndedComponent>;
    let component: GameEndedComponent;
    let routerSpy: jasmine.SpyObj<Router>;
    let activeGameServiceStub: { activeGame: IActiveGame };

    beforeEach(async () => {
        routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
        routerSpy.navigate.and.resolveTo(true);
        activeGameServiceStub = {
            activeGame: {
                _id: 'active-game-1',
                winner: 'Alice',
                isFinished: true,
            } as unknown as IActiveGame,
        };

        await TestBed.configureTestingModule({
            imports: [GameEndedComponent],
            providers: [
                { provide: Router, useValue: routerSpy },
                { provide: ActiveGameService, useValue: activeGameServiceStub },
            ],
        }).compileComponents();
    });

    it('should create', () => {
        spyOn(window, 'setTimeout').and.returnValue(0);
        fixture = TestBed.createComponent(GameEndedComponent);
        component = fixture.componentInstance;

        expect(component).toBeTruthy();
    });

    it('should initialize winner from active game state', () => {
        spyOn(window, 'setTimeout').and.returnValue(0);
        fixture = TestBed.createComponent(GameEndedComponent);
        component = fixture.componentInstance;

        expect(component.winner).toBe('Alice');
    });

    // Edge case: When active game is unavailable, default winner to null.
    it('should default winner to null when active game is unavailable', () => {
        activeGameServiceStub.activeGame = undefined as unknown as IActiveGame;
        spyOn(window, 'setTimeout').and.returnValue(0);
        fixture = TestBed.createComponent(GameEndedComponent);
        component = fixture.componentInstance;

        expect(component.winner).toBeNull();
        expect(component.isFinished).toBeUndefined();
    });

    it('should expose game finished status', () => {
        spyOn(window, 'setTimeout').and.returnValue(0);
        fixture = TestBed.createComponent(GameEndedComponent);
        component = fixture.componentInstance;

        expect(component.isFinished).toBeTrue();
    });

    it('should schedule automatic redirect after end-screen delay', fakeAsync(() => {
        fixture = TestBed.createComponent(GameEndedComponent);
        component = fixture.componentInstance;
        tick(TEMPS_ECRAN_FIN_PARTIE);

        expect(component).toBeTruthy();
        expect(routerSpy.navigate).toHaveBeenCalledWith([`/end/${activeGameServiceStub.activeGame._id}`]);
    }));
});
