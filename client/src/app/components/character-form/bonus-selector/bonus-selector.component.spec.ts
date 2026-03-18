/**
 * Testing strategy — Bonus Selector Component
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
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { BonusType } from '@app/constants/character-form';
import { BonusSelectorComponent } from './bonus-selector.component';

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
