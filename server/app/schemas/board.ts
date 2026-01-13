import { Schema } from "mongoose";
import { IItem, itemSchema } from "./items";

export const enum CellType {
    EMPTY = 'EMPTY',
    ICE = 'ICE',
    WALL = 'WALL',
    OPEN_DOOR = 'OPEN_DOOR',
    CLOSED_DOOR = 'CLOSED_DOOR',
}

export interface IBoard {
    cells: CellType[];
    items: IItem[];
}

export const gameBoard = new Schema<IBoard>({
    cells: {
        type: [String],
        required: true,
    },
    items: [itemSchema]
}, { _id: false });

