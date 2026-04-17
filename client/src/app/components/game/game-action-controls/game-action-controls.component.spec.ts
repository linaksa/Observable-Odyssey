/**
 * Testing strategy — Game Action Controls Component
 *
 * Approach:
 * - Instantiate the component and validate input defaults and output emitters.
 *
 * Edge cases covered:
 * - Outputs emit independently without relying on template interaction.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameActionControlsComponent } from '@app/components/game/game-action-controls/game-action-controls.component';

describe('GameActionControlsComponent', () => {
    let fixture: ComponentFixture<GameActionControlsComponent>;
    let component: GameActionControlsComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameActionControlsComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameActionControlsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('exposes default input values and emits requested actions', () => {
        const endTurnSpy = jasmine.createSpy('endTurnRequested');
        const toggleSpy = jasmine.createSpy('toggleActionModeRequested');
        component.endTurnRequested.subscribe(endTurnSpy);
        component.toggleActionModeRequested.subscribe(toggleSpy);

        // Nominal case: default inputs are initialized.
        expect(component.currentTurnPlayerName()).toBeNull();
        expect(component.showTurnTimer()).toBeFalse();
        expect(component.turnTimeLeftSeconds()).toBeNull();
        expect(component.canEndTurn()).toBeFalse();
        expect(component.actionMode()).toBeFalse();

        // Edge case: outputs can be emitted independently.
        component.endTurnRequested.emit();
        component.toggleActionModeRequested.emit();
        expect(endTurnSpy).toHaveBeenCalledTimes(1);
        expect(toggleSpy).toHaveBeenCalledTimes(1);
    });
});
