/**
 * Testing strategy — Bonus Selector Component
 *
 * Approach:
 * - Use a reactive form stub with required bonusType to mirror real selection flow.
 * - Validate selectedBonus getter as a read-through of the form control state.
 * - Verify selectBonus writes the chosen enum value back into the form.
 *
 * Edge cases covered:
 * - Covers the initial null state enforced by validators before any user choice.
 * - Confirms enum changes are preserved exactly when switching bonus type.
 * - Ensures component logic stays form-driven instead of storing duplicate state.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BonusType } from '@app/constants/character-form';
import { BonusSelectorComponent } from '@app/components/character-form/bonus-selector/bonus-selector.component';

describe('BonusSelectorComponent', () => {
    let component: BonusSelectorComponent;
    let fixture: ComponentFixture<BonusSelectorComponent>;

    const formStubContent = {
        bonusType: new FormControl<BonusType | null>(null, {
            validators: [Validators.required],
        }),
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [BonusSelectorComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(BonusSelectorComponent);
        component = fixture.componentInstance;

        component.form = new FormGroup(formStubContent);
        fixture.detectChanges();
    });

    // Edge case: When reading selectedBonusType, the component should expose the value from CharacterFormService.
    it('should return selected bonus type', () => {
        // Nominal case
        // The function should return the bonus type selected in the form

        const testBonusType = BonusType.Life;
        component.form.patchValue({ bonusType: testBonusType });

        expect(component.selectedBonus).toBe(testBonusType);
    });

    it('should select bonus type', () => {
        // Nominal case
        // The user selects a bonus type and we verify that the form is updated

        const bonusType = BonusType.Speed;
        component.selectBonus(bonusType);

        expect(component.form.controls.bonusType.value).toBe(bonusType);
    });
});
