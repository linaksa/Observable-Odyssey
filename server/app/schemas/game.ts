import { GameType, Visibility } from '@app/constants';
import { model, Schema } from 'mongoose';
import { gameBoard, IBoard } from './board';

export interface IGame {
    gameTitle: string;
    description: string;
    gameMode: GameType;
    lastModifiedDate: Date;
    dateCreated: Date;
    visibility: Visibility;
    preview: Base64URLString;
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
        maxLength: 1000,
    },
    gameMode: {
        type: String,
        enum: [GameType.Ctf, GameType.Classic],
        required: true,
    },
    lastModifiedDate: {
        type: Date,
        required: true,
    },
    dateCreated: {
        type: Date,
        required: true,
    },
    visibility: {
        type: String,
        enum: [Visibility.Hidden, Visibility.Viewable],
    },
    preview: {
        type: String,
        required: true,
    },
    board: gameBoard,

});


export const game = model<IGame>('Game', gameSchema);