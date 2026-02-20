import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BonusType } from '@app/classes/character/character.model';

@Component({
    selector: 'app-bonus-selector',
    imports: [CommonModule],
    templateUrl: './bonus-selector.component.html',
})
export class BonusSelectorComponent {
    @Input() selectedBonusType: BonusType | null = null;
    @Input() disabled = false;
    @Output() bonusSelected = new EventEmitter<BonusType>();

    selectBonus(type: BonusType): void {
        this.bonusSelected.emit(type);
    }
}
