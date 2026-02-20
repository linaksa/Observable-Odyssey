import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

type DiceSelectionType = 'attack' | 'defense';

@Component({
    selector: 'app-dice-selector',
    imports: [CommonModule],
    templateUrl: './dice-selector.component.html',
})
export class DiceSelectorComponent {
    @Input() selectedDiceType: DiceSelectionType | null = null;
    @Input() disabled = false;
    @Output() diceSelected = new EventEmitter<DiceSelectionType>();

    selectDice(type: DiceSelectionType): void {
        this.diceSelected.emit(type);
    }
}
