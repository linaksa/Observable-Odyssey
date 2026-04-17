/**
 * Testing strategy — Player Name Input Component
 *
 * Approach:
 * - Bind the component to a real reactive FormGroup containing playerName.
 * - Assert two-way interaction between DOM input value and form control updates.
 * - Verify template constraints such as maxlength and initial value rendering.
 *
 * Edge cases covered:
 * - Confirms initial form state ("Alice") appears in the input on first render.
 * - Ensures input events propagate new values back into the form control.
 * - Guards against accidental maxlength regressions on the name field.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { PlayerNameInputComponent } from '@app/components/character-form/player-name-input/player-name-input.component';

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
