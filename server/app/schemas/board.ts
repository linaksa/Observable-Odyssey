import { IBoard } from '@common/board';
import { Schema } from 'mongoose';
import { itemSchema } from './items';

export const gameBoard = new Schema<IBoard>(
    {
        cells: {
            type: [[String]],
            required: true,
        },
        items: [itemSchema],
    },
    { _id: false },
);
