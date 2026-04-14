import { dbServer } from '@app/database';
import { GameType, IGame, Visibility } from '@common/game';
import { Schema } from 'mongoose';
import { gameBoard } from './board';

export const gameSchema = new Schema<IGame>({
    gameTitle: {
        type: String,
        required: true,
        maxLength: 50,
    },
    description: {
        type: String,
        required: true,
        maxLength: 200,
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
    board: gameBoard,
});

export const game = dbServer.model<IGame>('Game', gameSchema);
