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