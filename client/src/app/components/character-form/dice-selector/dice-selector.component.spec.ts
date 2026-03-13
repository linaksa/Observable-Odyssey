import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup } from '@angular/forms';
import { DiceSelectionType } from '@app/constants/character-form';
import { DiceSelectorComponent } from './dice-selector.component';


describe('DiceSelectorComponent', () => {
    let component: DiceSelectorComponent;
    let fixture: ComponentFixture<DiceSelectorComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DiceSelectorComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(DiceSelectorComponent);
        component = fixture.componentInstance;

        component.form = new FormGroup({
            diceType: new FormControl<DiceSelectionType | null>(null),
        });

        fixture.detectChanges();
    });

    it('should set correct dice in the form when dice selected', () => {
        // Nominal case:
        // The user selects a dice type. The form is updated with the selected dice type.

        component.selectDice(DiceSelectionType.D6AttackAndD4Defense);
        expect(component.form.get('diceType')?.value).toBe(DiceSelectionType.D6AttackAndD4Defense);

        component.selectDice(DiceSelectionType.D4AttackAndD6Defense);
        expect(component.form.get('diceType')?.value).toBe(DiceSelectionType.D4AttackAndD6Defense);
    });

    it('should return correct selected dice type', () => {
        // Nominal case:
        // The form has a selected dice type. The selectedDiceType property returns that selected dice type.

        component.form.patchValue({ diceType: DiceSelectionType.D6AttackAndD4Defense });
        expect(component.selectedDiceType).toBe(DiceSelectionType.D6AttackAndD4Defense);
    });

    it('should return null when no dice type selected', () => {
        // Nominal case:
        // The form has no selected dice type. The selectedDiceType property returns null.

        component.form.patchValue({ diceType: null });
        expect(component.selectedDiceType).toBeNull();
    });
});