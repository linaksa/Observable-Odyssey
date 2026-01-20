import { CellType } from '@app/constants';
import { Schema } from 'mongoose';
import { IItem, itemSchema } from './items';


export interface IBoard {
    cells: CellType[][];
    items: IItem[];
}

export const gameBoard = new Schema<IBoard>({
    cells: {
        type: [[String]],
        required: true,
    },
    items: [itemSchema],
}, { _id: false });

