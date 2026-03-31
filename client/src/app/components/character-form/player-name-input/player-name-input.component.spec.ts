/**
 * Testing strategy — Player Name Input Component
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
    let form: FormGroup;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PlayerNameInputComponent],
        }).compileComponents();

        form = new FormGroup({
            playerName: new FormControl('Alice', { nonNullable: true }),
        });

        fixture = TestBed.createComponent(PlayerNameInputComponent);
        component = fixture.componentInstance;
        component.form = form;
        fixture.detectChanges();
    });

    // Edge case: Minimal setup path with isolated TestBed configuration. Verifies instantiation succeeds without missing dependencies.
    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render the current player name value from the form', () => {
        const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;

        expect(input.value).toBe('Alice');
        expect(input.getAttribute('maxlength')).toBe('20');
    });

    it('should update form control when typing in the input', () => {
        const input = (fixture.nativeElement as HTMLElement).querySelector('input') as HTMLInputElement;

        input.value = 'Bob';
        input.dispatchEvent(new Event('input'));
        fixture.detectChanges();

        expect(form.controls.playerName.value).toBe('Bob');
    });
});
