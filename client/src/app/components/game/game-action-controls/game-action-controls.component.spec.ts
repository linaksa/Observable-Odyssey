/**
 * Testing strategy — Game action controls
 *
 * - Validate rendering of turn/combat status and action-state message.
 * - Verify emitted events for end-turn and toggle-action interactions.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameActionControlsComponent } from './game-action-controls.component';

const TURN_TIMER_SECONDS = 12;

describe('GameActionControlsComponent', () => {
    let fixture: ComponentFixture<GameActionControlsComponent>;
    let component: GameActionControlsComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameActionControlsComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameActionControlsComponent);
        component = fixture.componentInstance;
    });

    it('renders turn status and normal action message', () => {
        // Nominal case
        fixture.componentRef.setInput('currentTurnPlayerName', 'Alice');
        fixture.componentRef.setInput('showTurnTimer', true);
        fixture.componentRef.setInput('turnTimeLeftSeconds', TURN_TIMER_SECONDS);
        fixture.componentRef.setInput('isInCombat', false);
        fixture.componentRef.setInput('isGameFinished', false);
        fixture.componentRef.setInput('isLocalPlayerTurn', true);
        fixture.componentRef.setInput('localPlayerHasActionLeft', true);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        expect(root.textContent).toContain('Tour de Alice');
        expect(root.textContent).toContain(`${TURN_TIMER_SECONDS}s`);
        expect(root.textContent).toContain('Vous pouvez agir.');
    });

    it('renders combat blocked message and emits control events', () => {
        // Edge case
        fixture.componentRef.setInput('isInCombat', true);
        fixture.componentRef.setInput('combatStatus', 'Combat en cours : Alice vs Bob');
        fixture.componentRef.setInput('canEndTurn', true);
        fixture.componentRef.setInput('canToggleActionMode', true);
        fixture.detectChanges();

        const endTurnSpy = jasmine.createSpy('endTurnSpy');
        const toggleSpy = jasmine.createSpy('toggleSpy');
        component.endTurnRequested.subscribe(endTurnSpy);
        component.toggleActionModeRequested.subscribe(toggleSpy);

        const [endTurnButton, actionButton] = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
        endTurnButton.click();
        actionButton.click();

        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Combat en cours : Alice vs Bob');
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Les actions de tour sont bloquées pendant le combat.');
        expect(endTurnSpy).toHaveBeenCalledTimes(1);
        expect(toggleSpy).toHaveBeenCalledTimes(1);
    });
});
