import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { BonusType, Character } from '@app/classes/character/character';

type DiceSelectionType = 'attack' | 'defense';

interface AvatarUI {
    name: string;
    image: string;
    attributes: Character;
}

@Component({
    selector: 'app-character-form',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatButtonModule,
        MatCardModule,
        MatDividerModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
    ],
    templateUrl: './character-form.component.html',
    styleUrls: ['./character-form.component.scss'],
})
export class CharacterFormComponent {
    readonly form = new FormGroup({
        playerName: new FormControl('', {
            nonNullable: true,
        }),
    });

    avatars: AvatarUI[] = Array.from({ length: 12 }, (_, i) => ({
        name: `Avatar ${i + 1}`,
        image: `assets/avatar${i + 1}.jpg`,
        attributes: new Character(),
    }));

    selectedAvatarIndex: number | null = null;
    selectedDiceType: DiceSelectionType | null = null;
    selectedBonusType: BonusType | null = null;

    selectAvatar(avatarIndex: number): void {
        if (!this.avatars[avatarIndex]) {
            return;
        }

        if (this.selectedAvatarIndex === avatarIndex) {
            this.selectedAvatarIndex = null;
            this.selectedBonusType = null;
            this.selectedDiceType = null;
            return;
        }

        this.selectedAvatarIndex = avatarIndex;
        this.avatars[avatarIndex].attributes = new Character();
        this.selectedBonusType = null;
        this.selectedDiceType = null;
    }

    addBonus(type: BonusType): void {
        if (this.selectedAvatarIndex === null) {
            return;
        }

        const selectedAvatar = this.avatars[this.selectedAvatarIndex];

        if (this.selectedBonusType) {
            selectedAvatar.attributes.removeBonus(this.selectedBonusType, 2);
        }

        if (this.selectedBonusType === type) {
            this.selectedBonusType = null;
            return;
        }

        this.selectedBonusType = type;
        selectedAvatar.attributes.addBonus(type, 2);
    }

    addDice(type: DiceSelectionType): void {
        if (this.selectedAvatarIndex === null) {
            return;
        }

        const selectedAvatar = this.avatars[this.selectedAvatarIndex];

        if (this.selectedDiceType === type) {
            this.selectedDiceType = null;
            selectedAvatar.attributes.attackDice = 'D4';
            selectedAvatar.attributes.defenseDice = 'D4';
            return;
        }

        this.selectedDiceType = type;

        if (type === 'attack') {
            selectedAvatar.attributes.attackDice = 'D6';
            selectedAvatar.attributes.defenseDice = 'D4';
            return;
        }

        selectedAvatar.attributes.attackDice = 'D4';
        selectedAvatar.attributes.defenseDice = 'D6';
    }
}

