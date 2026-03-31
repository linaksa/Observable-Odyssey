export const SANCTUARY_SIZE = 4;
export const SMALL_ITEM_SIZE = 1;

export enum ItemType {
    LifeSanctuary = 'lifeSanctuary',
    FightSanctuary = 'fightSanctuary',
    Flag = 'flag',
    StartingPosition = 'startingPosition',
}

export interface IItem {
    x: number;
    y: number;
    size: number;
    itemType: ItemType;
    active?: boolean;
    inactiveTurnsRemaining?: number;
    isCarried?: boolean;
}

export interface ILifeSanctuary extends IItem {
    active: boolean;
    itemType: ItemType.LifeSanctuary;
    size: typeof SANCTUARY_SIZE;
}

export interface IFightSanctuary extends IItem {
    active: boolean;
    itemType: ItemType.FightSanctuary;
    size: typeof SANCTUARY_SIZE;
}

export interface IStartingPosition extends IItem {
    itemType: ItemType.StartingPosition;
    size: typeof SMALL_ITEM_SIZE;
}

export interface IFlag extends IItem {
    itemType: ItemType.Flag;
    isCarried: boolean;
    size: typeof SMALL_ITEM_SIZE;
}

export type GameItem = IFlag | IStartingPosition | IFightSanctuary | ILifeSanctuary;
