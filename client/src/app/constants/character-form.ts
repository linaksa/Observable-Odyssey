import { Avatar } from '@common/constants';

export const PLAYER_NAME_PATTERN = /^(?:[A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u00FF0-9])+$/;

export const AVATAR_IMAGE_PATH_MODEL = './assets/form-page/{}.png';

export enum BonusType {
    Life,
    Speed,
}

export enum DiceSelectionType {
    D6AttackAndD4Defense,
    D4AttackAndD6Defense,
}

export interface RandomCharacterData {
    playerName: string;
    avatar: Avatar;
    bonusType: BonusType;
    diceType: DiceSelectionType;
}

export const AVAILABLE_BONUS_TYPES = [BonusType.Life, BonusType.Speed];

export const AVAILABLE_DICE_TYPES = [DiceSelectionType.D4AttackAndD6Defense, DiceSelectionType.D6AttackAndD4Defense];

export const BONUS_VALUE = 2;
