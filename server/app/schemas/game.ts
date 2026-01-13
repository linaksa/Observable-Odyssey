import { Schema, model } from "mongoose";

interface IGame {
    gameTitle: string;
    description: string;
    gameMode: string;
    lastModifiedDate: Date;
    dateCreated: Date;
    visibility: String;
}
// TODO add the board
const gameSchema = new Schema<IGame>({
    gameTitle: {
        type: String,
        required: true,
        maxLenght: 100
    },
    description: {
        type: String,
        required: true,
        maxLenght: 1000
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


})


export const Game = model<IGame>('Game', gameSchema);