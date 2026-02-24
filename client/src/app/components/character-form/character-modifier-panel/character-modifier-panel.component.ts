import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BonusType } from '@app/classes/character/character.model';
import { BonusSelectorComponent } from '@app/components/character-form/bonus-selector/bonus-selector.component';
import { DiceSelectorComponent } from '@app/components/character-form/dice-selector/dice-selector.component';
import { FormActionsComponent } from '@app/components/character-form/form-actions/form-actions.component';

type DiceSelectionType = 'attack' | 'defense';

@Component({
    selector: 'app-character-modifier-panel',
    imports: [CommonModule, BonusSelectorComponent, DiceSelectorComponent, FormActionsComponent],
    templateUrl: './character-modifier-panel.component.html',
})
export class CharacterModifierPanelComponent {
    @Input() selectedAvatarIndex: number | null = null;
    @Input() selectedBonusType: BonusType | null = null;
    @Input() selectedDiceType: DiceSelectionType | null = null;
    @Input() formValid = false;

    @Output() bonusSelected = new EventEmitter<BonusType>();
    @Output() diceSelected = new EventEmitter<DiceSelectionType>();
    @Output() randomCharacterRequested = new EventEmitter<void>();
    @Output() formSubmitted = new EventEmitter<void>();

    selectBonus(type: BonusType): void {
        this.bonusSelected.emit(type);
    }

    selectDice(type: DiceSelectionType): void {
        this.diceSelected.emit(type);
    }

    generateRandom(): void {
        this.randomCharacterRequested.emit();
    }

    submitForm(): void {
        this.formSubmitted.emit();
    }
}
