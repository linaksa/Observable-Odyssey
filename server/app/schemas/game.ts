import { model, Schema } from "mongoose";
import { gameBoard, IBoard } from "./board";

interface IGame {
    gameTitle: string;
    description: string;
    gameMode: string;
    lastModifiedDate: Date;
    dateCreated: Date;
    visibility: string;
    board: IBoard;
}

const gameSchema = new Schema<IGame>({
    gameTitle: {
        type: String,
        required: true,
        maxLength: 100,
        unique: true,
    },
    description: {
        type: String,
        required: true,
        maxLength: 1000
    },
    gameMode: {
        type: String,
        enum: ['ctf', 'classic'],
        required: true
    },
    lastModifiedDate: {
        type: Date,
        required: true
    },
    dateCreated: {
        type: Date,
        required: true
    },
    visibility: {
        type: String,
        enum: ['hidden', 'viewable']
    },
    board: gameBoard

})


export const Game = model<IGame>('Game', gameSchema);