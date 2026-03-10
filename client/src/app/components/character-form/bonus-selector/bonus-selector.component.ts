import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { AVAILABLE_BONUS_TYPES, BonusType } from '@app/constants/character-form';

@Component({
    selector: 'app-bonus-selector',
    imports: [CommonModule],
    templateUrl: './bonus-selector.component.html',
})
export class BonusSelectorComponent {
    @Input() form: FormGroup;

    availableBonusTypes = AVAILABLE_BONUS_TYPES;

    bonusLabels = {
        [BonusType.Life]: '+2 vie',
        [BonusType.Speed]: '+2 rapidité',
    };

    selectBonus(type: BonusType): void {
        this.form.patchValue({ bonusType: type });
    }

    get selectedBonus(): BonusType | null {
        return this.form.get('bonusType')?.value ?? null;
    }
}
