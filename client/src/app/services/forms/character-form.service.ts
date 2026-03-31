import { inject, Injectable, signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import {
    AVAILABLE_BONUS_TYPES,
    AVAILABLE_DICE_TYPES,
    BONUS_VALUE,
    BonusType,
    DiceSelectionType,
    PLAYER_NAME_PATTERN,
    RandomCharacterData,
} from '@app/constants/character-form';
import { HTTP_CLIENT, HttpClientPort } from '@app/http/http-interface';
import { ResponseType } from '@app/http/http-model';
import { IActiveGameWithPlayer } from '@common/activeGame';
import { CharacterFormData, VirtualPlayerProfile } from '@common/character';
import {
    Avatar,
    DEFAULT_PLAYER_ATTACK_POINTS,
    DEFAULT_PLAYER_DEFENSE_POINTS,
    DEFAULT_PLAYER_LIFE_POINTS,
    DEFAULT_PLAYER_SPEED_POINTS,
    DiceType,
    PLAYER_NAME_MAX_LENGTH,
    PLAYER_NAME_MIN_LENGTH,
} from '@common/constants';
import { Observable } from 'rxjs/internal/Observable';
import { environment } from 'src/environments/environment';

const RANDOM_NUMBER_SCALE = 1000;
const RANDOM_PLAYER_NAME_PREFIX = 'Player';

@Injectable({
    providedIn: 'root',
})
export class CharacterFormService {
    private readonly httpClient: HttpClientPort = inject(HTTP_CLIENT);
    private readonly baseUrl: string = environment.apiUrl;

    isLoading = signal<boolean>(false);
    errors = signal<string | null>(null);
    unavailableAvatars = signal<Avatar[]>([]);

    characterForm = new FormGroup({
        playerName: new FormControl('', {
            nonNullable: true,
            validators: [
                Validators.required,
                Validators.minLength(PLAYER_NAME_MIN_LENGTH),
                Validators.maxLength(PLAYER_NAME_MAX_LENGTH),
                Validators.pattern(PLAYER_NAME_PATTERN),
            ],
        }),
        avatar: new FormControl<Avatar | null>(null, {
            validators: [Validators.required],
        }),
        bonusType: new FormControl<BonusType | null>(null, {
            validators: [Validators.required],
        }),
        diceType: new FormControl<DiceSelectionType | null>(null, {
            validators: [Validators.required],
        }),
    });

    initializeForm(): void {
        this.characterForm.reset();
        this.isLoading.set(false);
        this.errors.set(null);
        this.unavailableAvatars.set([]);
    }

    get lifePoints(): number {
        let life = DEFAULT_PLAYER_LIFE_POINTS;
        if (this.characterForm.get('bonusType')?.value === BonusType.Life) {
            life += BONUS_VALUE;
        }
        return life;
    }

    get speedPoints(): number {
        let speed = DEFAULT_PLAYER_SPEED_POINTS;
        if (this.characterForm.get('bonusType')?.value === BonusType.Speed) {
            speed += BONUS_VALUE;
        }
        return speed;
    }

    get attackPoints(): number {
        return DEFAULT_PLAYER_ATTACK_POINTS;
    }

    get defensePoints(): number {
        return DEFAULT_PLAYER_DEFENSE_POINTS;
    }

    get attackDiceType(): DiceType {
        const diceType = this.characterForm.get('diceType')?.value;
        if (diceType === DiceSelectionType.D4AttackAndD6Defense) {
            return DiceType.FourSided;
        } else {
            return DiceType.SixSided;
        }
    }

    get defenseDiceType(): DiceType {
        const diceType = this.characterForm.get('diceType')?.value;
        if (diceType === DiceSelectionType.D4AttackAndD6Defense) {
            return DiceType.SixSided;
        } else {
            return DiceType.FourSided;
        }
    }

    createActiveGameWithCharacter(gameId: string, characterData: CharacterFormData): Observable<IActiveGameWithPlayer> {
        // Logic to create an active game with the provided character data
        this.unavailableAvatars.set([...this.unavailableAvatars(), characterData.avatar]);
        return this.httpClient.post(`${this.baseUrl}/activeGame/`, { gameId, characterForm: characterData }, { responseType: ResponseType.Text });
    }

    joinActiveGameWithCharacter(activeGameId: string, characterData: CharacterFormData): Observable<IActiveGameWithPlayer> {
        this.unavailableAvatars.set([...this.unavailableAvatars(), characterData.avatar]);
        return this.httpClient.patch(
            `${this.baseUrl}/activeGame/join`,
            { activeGameId, characterForm: characterData },
            { responseType: ResponseType.Text },
        );
    }

    populateWithRandomData(): void {
        const data = this.generateRandomCharacterData();
        this.characterForm.patchValue(data);
    }

    private generateRandomCharacterData(): RandomCharacterData {
        const random = Math.random;
        const randomName = `${RANDOM_PLAYER_NAME_PREFIX}${Math.floor(random() * RANDOM_NUMBER_SCALE)}`;

        const availableAvatars = Object.values(Avatar).filter((avatar) => !this.unavailableAvatars().includes(avatar));
        const randomAvatar = availableAvatars[Math.floor(random() * availableAvatars.length)];

        const randomBonus = AVAILABLE_BONUS_TYPES[Math.floor(random() * AVAILABLE_BONUS_TYPES.length)];

        const randomDice = AVAILABLE_DICE_TYPES[Math.floor(random() * AVAILABLE_DICE_TYPES.length)];

        return {
            playerName: randomName,
            avatar: randomAvatar,
            bonusType: randomBonus as BonusType,
            diceType: randomDice as DiceSelectionType,
        };
    }

    createVirtualPlayer(profileOptions: VirtualPlayerProfile, activeGameId: string): Observable<IActiveGameWithPlayer> {
        this.populateWithRandomData();
        const data: CharacterFormData = {
            name: this.characterForm.controls.playerName.value,
            avatar: this.characterForm.controls.avatar.value as Avatar,
            initialHealth: this.lifePoints,
            rapidityPoints: this.speedPoints,
            attackPoints: this.attackPoints,
            defensePoints: this.defensePoints,
            attackBonusDiceType: this.attackDiceType,
            defenseBonusDiceType: this.defenseDiceType,
            virtualPlayerProfile: profileOptions,
        };
        this.unavailableAvatars.set([...this.unavailableAvatars(), data.avatar]);

        return this.joinActiveGameWithCharacter(activeGameId, data);
    }
}
