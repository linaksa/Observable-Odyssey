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
import { BonusType, CharacterModel, DiceSelectionType } from '@app/classes/character/character.model';
import { Avatar, PLAYER_NAME_MAX_LENGTH, PLAYER_NAME_MIN_LENGTH, RANDOM_PLAYER_NAMES } from '@common/constants';

type SelectionState = {
    avatarIndex: number | null;
    bonusType: BonusType | null;
    diceType: DiceSelectionType | null;
};

const BONUS_AMOUNT = 2;
const RANDOM_CHOICE_PROBABILITY = 0.5;

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
})
export class CharacterFormComponent {
    readonly form = new FormGroup({
        playerName: new FormControl('', {
            nonNullable: true,
            validators: [
                Validators.required,
                Validators.minLength(PLAYER_NAME_MIN_LENGTH),
                Validators.maxLength(PLAYER_NAME_MAX_LENGTH),
                //  Autorise uniquement lettres (avec accents) et chiffres, aucun espace ni symbole
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
        image: `assets/form-page/avatar${i + 1}.png`,
        character: CharacterModel.createDefault(`avatar${i + 1}` as Avatar),
    }));

    private selectionState: SelectionState = {
        avatarIndex: null,
        bonusType: null,
        diceType: null,
    };
    submitted = false;
    errorMessage = '';

    get selectedAvatarIndex(): number | null {
        return this.selectionState.avatarIndex;
    }

    get selectedBonusType(): BonusType | null {
        return this.selectionState.bonusType;
    }

    get selectedDiceType(): DiceSelectionType | null {
        return this.selectionState.diceType;
    }

    generateRandomCharacter(): void {
        const previousAvatarIndex = this.selectionState.avatarIndex;

        this.form.controls.playerName.setValue(this.pickRandomName());
        this.resetSelections();

        const avatarIndex = this.pickRandomAvatarIndex(previousAvatarIndex);
        this.selectAvatar(avatarIndex);

        this.addBonus(this.pickRandomBonus());
        this.addDice(this.pickRandomDice());
    }

    selectAvatar(avatarIndex: number): void {
        if (!this.avatars[avatarIndex]) {
            return;
        }

        if (this.selectionState.avatarIndex === avatarIndex) {
            this.resetSelections();
            return;
        }

        this.selectionState.avatarIndex = avatarIndex;
        this.avatars[avatarIndex].character = CharacterModel.createDefault(this.avatars[avatarIndex].avatar);
        this.applySelectionsToAvatar(avatarIndex);
    }

    private applySelectionsToAvatar(avatarIndex: number): void {
        const selectedAvatar = this.avatars[avatarIndex];

        selectedAvatar.character.applyBonusSelection(null, this.selectionState.bonusType, BONUS_AMOUNT);
        selectedAvatar.character.applyDiceChoice(this.selectionState.diceType);
        this.syncFormWithSelection();
    }

    addBonus(type: BonusType): void {
        if (this.selectionState.avatarIndex === null) {
            return;
        }

        const selectedAvatar = this.avatars[this.selectionState.avatarIndex];
        const previous = this.selectionState.bonusType;
        const next = previous === type ? null : type;

        this.selectionState.bonusType = next;
        selectedAvatar.character.applyBonusSelection(previous, next, BONUS_AMOUNT);
        this.syncFormWithSelection();
    }

    addDice(type: DiceSelectionType): void {
        if (this.selectionState.avatarIndex === null) {
            return;
        }

        const selectedAvatar = this.avatars[this.selectionState.avatarIndex];
        const previous = this.selectionState.diceType;
        const next = previous === type ? null : type;

        this.selectionState.diceType = next;
        selectedAvatar.character.applyDiceChoice(next);
        this.syncFormWithSelection();
    }

    private resetSelections(): void {
        this.selectionState = {
            avatarIndex: null,
            bonusType: null,
            diceType: null,
        };
        this.syncFormWithSelection();
    }

    private syncFormWithSelection(): void {
        this.form.controls.avatarIndex.setValue(this.selectionState.avatarIndex);
        this.form.controls.bonusType.setValue(this.selectionState.bonusType);
        this.form.controls.diceType.setValue(this.selectionState.diceType);
    }

    private pickRandomName(): string {
        return RANDOM_PLAYER_NAMES[this.pickRandomIndex(RANDOM_PLAYER_NAMES.length)];
    }

    private pickRandomBonus(): BonusType {
        return this.nextRandom() < RANDOM_CHOICE_PROBABILITY ? 'life' : 'speed';
    }

    private pickRandomDice(): DiceSelectionType {
        return this.nextRandom() < RANDOM_CHOICE_PROBABILITY ? 'attack' : 'defense';
    }

    private pickRandomAvatarIndex(excludeIndex: number | null): number {
        if (this.avatars.length <= 1 || excludeIndex === null) {
            return this.pickRandomIndex(this.avatars.length);
        }

        let avatarIndex = this.pickRandomIndex(this.avatars.length);
        while (avatarIndex === excludeIndex) {
            avatarIndex = this.pickRandomIndex(this.avatars.length);
        }
        return avatarIndex;
    }

    private pickRandomIndex(max: number): number {
        if (max <= 0) {
            return 0;
        }
        return Math.floor(this.nextRandom() * max);
    }

    private nextRandom(): number {
        return Math.random();
    }
}
