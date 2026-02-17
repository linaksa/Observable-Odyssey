import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AvatarI } from '@app/classes/character/AvatarI';
import { BonusType, CharacterModel } from '@app/classes/character/character.model';
import { AvatarSelectorComponent } from '@app/components/avatar-selector/avatar-selector.component';
import { BackNavigationComponent } from '@app/components/back-navigation/back-navigation.component';
import { CharacterInfoPanelComponent } from '@app/components/character-info-panel/character-info-panel.component';
import { CharacterModifierPanelComponent } from '@app/components/character-modifier-panel/character-modifier-panel.component';
import { FormPageHeaderComponent } from '@app/components/form-page-header/form-page-header.component';
import { Avatar, DiceType, PLAYER_NAME_MAX_LENGTH, PLAYER_NAME_MIN_LENGTH, RANDOM_PLAYER_NAMES } from '@common/constants';

type DiceSelectionType = 'attack' | 'defense';

const BONUS_AMOUNT = 2;
const RANDOM_CHOICE_PROBABILITY = 0.5;
const AVATAR_COUNT = 12;
const AVATAR_ASSET_BASE = 'assets/form-page';
// Latin letters (with accents) and numbers only. No spaces or symbols
const PLAYER_NAME_PATTERN = /^(?:[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF0-9])+$/;

@Component({
    selector: 'app-form-page',
    imports: [
        CommonModule,
        ReactiveFormsModule,
        BackNavigationComponent,
        FormPageHeaderComponent,
        AvatarSelectorComponent,
        CharacterInfoPanelComponent,
        CharacterModifierPanelComponent,
    ],
    templateUrl: './form-page.component.html',
})
export class FormPageComponent {
    private router = inject(Router);
    readonly form = new FormGroup({
        playerName: new FormControl('', {
            nonNullable: true,
            validators: [
                Validators.required,
                Validators.minLength(PLAYER_NAME_MIN_LENGTH),
                Validators.maxLength(PLAYER_NAME_MAX_LENGTH),
                Validators.pattern(PLAYER_NAME_PATTERN),
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

    private readonly random = Math.random;
    readonly avatars: AvatarI[] = this.buildAvatars();

    private get playerNameCtrl(): FormControl<string> {
        return this.form.controls.playerName;
    }

    private get avatarIndexCtrl(): FormControl<number | null> {
        return this.form.controls.avatarIndex;
    }

    private get bonusTypeCtrl(): FormControl<BonusType | null> {
        return this.form.controls.bonusType;
    }

    private get diceTypeCtrl(): FormControl<DiceSelectionType | null> {
        return this.form.controls.diceType;
    }

    get selectedAvatarIndex(): number | null {
        return this.avatarIndexCtrl.value;
    }

    get selectedDiceType(): DiceSelectionType | null {
        return this.diceTypeCtrl.value;
    }

    get selectedBonusType(): BonusType | null {
        return this.bonusTypeCtrl.value;
    }

    generateRandomCharacter(): void {
        if (this.avatars.length === 0) {
            return;
        }

        this.playerNameCtrl.setValue(this.pickRandomName());

        const avatarIndex = this.pickRandomAvatarIndex(this.avatarIndexCtrl.value);
        this.selectAvatar(avatarIndex);

        this.addBonus(this.pickRandomBonus());
        this.addDice(this.pickRandomDice());
    }

    selectAvatar(avatarIndex: number): void {
        if (!this.avatars[avatarIndex]) {
            return;
        }

        if (this.avatarIndexCtrl.value === avatarIndex) {
            this.avatarIndexCtrl.setValue(null);
            return;
        }

        this.avatarIndexCtrl.setValue(avatarIndex);
        this.applySelectionsToAvatar(avatarIndex);
    }

    addBonus(type: BonusType): void {
        this.toggleSelection(this.bonusTypeCtrl, type, (previous, next, selectedAvatar) => {
            if (previous) {
                selectedAvatar.character.removeBonus(previous, BONUS_AMOUNT);
            }
            if (next) {
                selectedAvatar.character.addBonus(next, BONUS_AMOUNT);
            }
        });
    }

    addDice(type: DiceSelectionType): void {
        this.toggleSelection(this.diceTypeCtrl, type, (_previous, next, selectedAvatar) => {
            if (next === null) {
                selectedAvatar.character.attackBonusDiceType = DiceType.FourSided;
                selectedAvatar.character.defenseBonusDiceType = DiceType.FourSided;
                return;
            }

            if (next === 'attack') {
                selectedAvatar.character.attackBonusDiceType = DiceType.SixSided;
                selectedAvatar.character.defenseBonusDiceType = DiceType.FourSided;
                return;
            }

            selectedAvatar.character.attackBonusDiceType = DiceType.FourSided;
            selectedAvatar.character.defenseBonusDiceType = DiceType.SixSided;
        });
    }

    onFormSubmitted() {
        this.router.navigate(['wait']);
    }

    private toggleSelection<T>(
        control: FormControl<T | null>,
        type: T,
        apply: (previous: T | null, next: T | null, selectedAvatar: AvatarI) => void,
    ): void {
        const previous = control.value;
        if (previous === type) {
            // already selected; do nothing
            return;
        }
        const next = type;

        control.setValue(next);

        const selectedAvatarIndex = this.avatarIndexCtrl.value;
        if (selectedAvatarIndex === null) {
            return;
        }

        const selectedAvatar = this.avatars[selectedAvatarIndex];
        apply(previous, next, selectedAvatar);
    }

    private applySelectionsToAvatar(avatarIndex: number): void {
        if (!this.avatars[avatarIndex]) {
            return;
        }

        const selectedAvatar = this.avatars[avatarIndex];
        const bonusType = this.bonusTypeCtrl.value;
        const diceType = this.diceTypeCtrl.value;

        if (bonusType) {
            selectedAvatar.character.addBonus(bonusType, BONUS_AMOUNT);
        }

        if (diceType === 'attack') {
            selectedAvatar.character.attackBonusDiceType = DiceType.SixSided;
            selectedAvatar.character.defenseBonusDiceType = DiceType.FourSided;
            return;
        }

        if (diceType === 'defense') {
            selectedAvatar.character.attackBonusDiceType = DiceType.FourSided;
            selectedAvatar.character.defenseBonusDiceType = DiceType.SixSided;
        }
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
        return this.random();
    }

    private buildAvatars(): AvatarI[] {
        return Array.from({ length: AVATAR_COUNT }, (_, i) => ({
            name: `Avatar ${i + 1}`,
            avatar: `avatar${i + 1}` as Avatar,
            image: `${AVATAR_ASSET_BASE}/avatar${i + 1}.png`,
            character: CharacterModel.createDefault(`avatar${i + 1}` as Avatar),
        }));
    }
}
