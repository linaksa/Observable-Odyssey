import { DiceType } from '@common/constants';

export const DICE_ICON_MAPPING: { [key in DiceType]: string } = {
    [DiceType.FourSided]: './assets/form-page/4_sided_dice.svg',
    [DiceType.SixSided]: './assets/form-page/6_sided_dice.svg',
};
