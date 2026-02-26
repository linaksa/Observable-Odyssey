import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { DiceSelectionType } from '@app/constants/character-form';

@Component({
    selector: 'app-dice-selector',
    imports: [CommonModule],
    templateUrl: './dice-selector.component.html',
})
export class DiceSelectorComponent {
    @Input() form: FormGroup;

    availableDiceTypes = [
        DiceSelectionType.D4AttackAndD6Defense,
        DiceSelectionType.D6AttackAndD4Defense,
    ];

    diceTypeLabels = {
        [DiceSelectionType.D6AttackAndD4Defense]: 'Attaque 6, défense 4',
        [DiceSelectionType.D4AttackAndD6Defense]: 'Attaque 4, défense 6',
    };

    selectDice(type: DiceSelectionType): void {
        this.form.patchValue({ diceType: type });
    }

    get selectedDiceType(): DiceSelectionType | null {
        return this.form.get('diceType')?.value ?? null;
    }
}
