import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { AvatarI } from '@app/classes/character/AvatarI';
import { BonusType, CharacterModel } from '@app/classes/character/character.model';
import { Avatar, DiceType, PLAYER_NAME_MAX_LENGTH, PLAYER_NAME_MIN_LENGTH, RANDOM_PLAYER_NAMES } from '@common/constants';

type DiceSelectionType = 'attack' | 'defense';

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
        RouterLink,
    ],
    templateUrl: './character-form.component.html',
    styleUrl: './character-form.component.scss',
})
export class CharacterFormComponent {
    readonly form = new FormGroup({
        playerName: new FormControl('', {
            nonNullable: true,
            validators: [
                Validators.required,
                Validators.minLength(PLAYER_NAME_MIN_LENGTH),
                Validators.maxLength(PLAYER_NAME_MAX_LENGTH),
                Validators.pattern(/^(?:[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF0-9])+$/),
            ],
        }),
        avatarIndex: new FormControl<number | null>(null, {
            validators: [Validators.required],
        }),
        bonusType: new FormControl<BonusType | null>(null, {
            validators: [Validators.required],
        }),
        diceType: new FormControl<DiceSelectionType | null>(null, {
            validators: [Validators.required],
        }),
    });

    avatars: AvatarI[] = Array.from({ length: 12 }, (_, i) => ({
        name: `Avatar ${i + 1}`,
        avatar: `avatar${i + 1}` as Avatar,
        image: `assets/avatar${i + 1}.png`,
        character: CharacterModel.createDefault(`avatar${i + 1}` as Avatar),
    }));

    selectedAvatarIndex: number | null = null;
    selectedDiceType: DiceSelectionType | null = null;
    selectedBonusType: BonusType | null = null;
    submitted = false;
    errorMessage = '';

generateRandomCharacter(): void {
        this.form.controls.playerName.setValue(RANDOM_PLAYER_NAMES[Math.floor(Math.random() * RANDOM_PLAYER_NAMES.length)]);

        let avatarIndex = Math.floor(Math.random() * this.avatars.length);
        if (this.selectedAvatarIndex !== null && this.avatars.length > 1) {
            while (avatarIndex === this.selectedAvatarIndex) {
                avatarIndex = Math.floor(Math.random() * this.avatars.length);
            }
        }
        this.selectAvatar(avatarIndex);

        const randomChances = 0.5;

        const bonus: BonusType = Math.random() < randomChances ? 'life' : 'speed';
        this.addBonus(bonus);

        const dice: DiceSelectionType = Math.random() < randomChances ? 'attack' : 'defense';
        this.addDice(dice);
    }

    selectAvatar(avatarIndex: number): void {
        if (!this.avatars[avatarIndex]) {
            return;
        }

        if (this.selectedAvatarIndex === avatarIndex) {
            this.selectedAvatarIndex = null;
            this.selectedBonusType = null;
            this.selectedDiceType = null;
            this.form.controls.avatarIndex.setValue(null);
            this.form.controls.bonusType.setValue(null);
            this.form.controls.diceType.setValue(null);
            return;
        }

        this.selectedAvatarIndex = avatarIndex;
        this.avatars[avatarIndex].character = CharacterModel.createDefault(this.avatars[avatarIndex].avatar);
        this.selectedBonusType = null;
        this.selectedDiceType = null;
        this.form.controls.avatarIndex.setValue(avatarIndex);
        this.form.controls.bonusType.setValue(null);
        this.form.controls.diceType.setValue(null);
    }


    addBonus(type: BonusType): void {
        if (this.selectedAvatarIndex === null) {
            return;
        }

        const selectedAvatar = this.avatars[this.selectedAvatarIndex];

        if (this.selectedBonusType) {
            selectedAvatar.character.removeBonus(this.selectedBonusType, 2);
        }

        if (this.selectedBonusType === type) {
            this.selectedBonusType = null;
            this.form.controls.bonusType.setValue(null);
            return;
        }

        this.selectedBonusType = type;
        selectedAvatar.character.addBonus(type, 2);
        this.form.controls.bonusType.setValue(type);
    }

    addDice(type: DiceSelectionType): void {
        if (this.selectedAvatarIndex === null) {
            return;
        }

        const selectedAvatar = this.avatars[this.selectedAvatarIndex];

        if (this.selectedDiceType === type) {
            this.selectedDiceType = null;
            selectedAvatar.character.attackBonusDiceType = DiceType.FourSided;
            selectedAvatar.character.defenseBonusDiceType = DiceType.FourSided;
            this.form.controls.diceType.setValue(null);
            return;
        }

        this.selectedDiceType = type;
        this.form.controls.diceType.setValue(type);

        if (type === 'attack') {
            selectedAvatar.character.attackBonusDiceType = DiceType.SixSided;
            selectedAvatar.character.defenseBonusDiceType = DiceType.FourSided;
            return;
        }

        selectedAvatar.character.attackBonusDiceType = DiceType.FourSided;
        selectedAvatar.character.defenseBonusDiceType = DiceType.SixSided;
    }

    // confirmChanges(): void {
    //     this.submitted = true;

    //     if (this.form.controls.playerName.invalid) {
    //         this.errorMessage = 'Votre nom ne doit contenir que des lettres (entre 3 et 20 lettres)';
    //         return;
    //     }

    //     if (this.form.controls.avatarIndex.invalid) {
    //         this.errorMessage = 'Vous devez choisir un avatar';
    //         return;
    //     }

    //     if (this.form.controls.diceType.invalid) {
    //         this.errorMessage = 'Vous devez assigner les des';
    //         return;
    //     }

    //     if (this.form.controls.bonusType.invalid) {
    //         this.errorMessage = 'Vous devez ajouter un bonus';
    //         return;
    //     }

    //     this.errorMessage = '';
    // }
}
