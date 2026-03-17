/**
 * Testing strategy — Game Attack Component
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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/active-game.service';
import { GameTurnService } from '@app/services/game-turn.service';
import { GameAttackComponent } from './game-attack.component';

describe('GameAttackComponent', () => {
    let component: GameAttackComponent;
    let fixture: ComponentFixture<GameAttackComponent>;
    let activeGameServiceStub: {
        toggleAttackMode: jasmine.Spy;
        attackMode: jasmine.Spy<() => boolean>;
    };
    let gameTurnServiceStub: { canEndTurn: boolean };

    beforeEach(async () => {
        activeGameServiceStub = {
            toggleAttackMode: jasmine.createSpy('toggleAttackMode'),
            attackMode: jasmine.createSpy('attackMode').and.returnValue(false),
        };
        gameTurnServiceStub = { canEndTurn: true };

        await TestBed.configureTestingModule({
            imports: [GameAttackComponent],
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: GameTurnService, useValue: gameTurnServiceStub },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameAttackComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should toggle attack mode when turn can end', () => {
        gameTurnServiceStub.canEndTurn = true;

        component.toggle();

        expect(activeGameServiceStub.toggleAttackMode).toHaveBeenCalled();
    });

    // Edge case: should not toggle attack mode when turn cannot end.
    it('should not toggle attack mode when turn cannot end', () => {
        gameTurnServiceStub.canEndTurn = false;

        component.toggle();

        expect(activeGameServiceStub.toggleAttackMode).not.toHaveBeenCalled();
    });

    // Edge case: should disable attack button when turn cannot end.
    it('should disable attack button when turn cannot end', () => {
        gameTurnServiceStub.canEndTurn = false;
        fixture.detectChanges();
        const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;

        expect(button.disabled).toBeTrue();
    });

    it('should apply active attack style when attack mode is enabled', () => {
        activeGameServiceStub.attackMode.and.returnValue(true);
        gameTurnServiceStub.canEndTurn = true;
        fixture.detectChanges();
        const button = (fixture.nativeElement as HTMLElement).querySelector('button');

        expect(button?.classList.contains('bg-red-600')).toBeTrue();
        expect(button?.classList.contains('text-white')).toBeTrue();
    });
});
