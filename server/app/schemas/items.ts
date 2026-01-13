import { Schema } from "mongoose";



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
    itemType: 'lifeSanctuary';
    size: 4;
}

export interface IFightSanctuary extends IItem {
    active: boolean;
    itemType: 'fightSanctuary';
    size: 4;
}

export interface IStartingPosition extends IItem {
    itemType: 'startingPosition';
    size: 1;
}

export interface IFlag extends IItem {
    itemType: 'flag';
    isCarried: boolean;
    size: 1;
}

export type GameItem = IFlag | IStartingPosition | IFightSanctuary | ILifeSanctuary;


export const itemSchema = new Schema<IItem>({
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    size: { type: Number, required: true },
    itemType: { type: String, required: true },
    active: { type: Boolean },
    isCarried: { type: Boolean }
}, { _id: false });