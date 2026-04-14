import { DiceType } from '@common/constants';

export const DICE_ICON_MAPPING: { [key in DiceType]: string } = {
    [DiceType.FourSided]: './assets/form-page/4_sided_dice.svg',
    [DiceType.SixSided]: './assets/form-page/6_sided_dice.svg',
};

export const DEFAULT_PLAYER_NAME_COLOR = '#ffffff';
export const RED_TEAM_PLAYER_NAME_COLOR = '#f87171';
export const BLUE_TEAM_PLAYER_NAME_COLOR = '#60a5fa';
