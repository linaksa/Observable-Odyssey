import { ItemType, SANCTUARY_SIZE, SMALL_ITEM_SIZE } from '@app/constants';
import { Schema } from 'mongoose';

export interface IItem {
    x: number;
    y: number;
    size: number;
    itemType: string;
    active?: boolean;
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


export const itemSchema = new Schema<IItem>({
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    size: { type: Number, required: true },
    itemType: { type: String, required: true },
    active: { type: Boolean },
    isCarried: { type: Boolean },
}, { _id: false });