import { Avatar } from '@common/constants';
import { BonusType, DiceSelectionType } from '@app/constants/character-form';

export interface RandomCharacterData {
    playerName: string;
    avatar: Avatar;
    bonusType: BonusType;
    diceType: DiceSelectionType;
}
