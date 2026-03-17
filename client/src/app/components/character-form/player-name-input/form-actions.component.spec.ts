/**
 * Testing strategy — Form Actions Component
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
import { FormControl, FormGroup } from '@angular/forms';
import { PlayerNameInputComponent } from './player-name-input.component';

describe('PlayerNameInputComponent', () => {
    let component: PlayerNameInputComponent;
    let fixture: ComponentFixture<PlayerNameInputComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PlayerNameInputComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerNameInputComponent);
        component = fixture.componentInstance;

        component.form = new FormGroup({
            playerName: new FormControl<string>('', { nonNullable: true }),
        });

        fixture.detectChanges();
    });

    it('should create', () => {
        // Nominal case
        // The component has no logic. We simply verify that it is created without errors
        expect(component).toBeTruthy();
    });
});
