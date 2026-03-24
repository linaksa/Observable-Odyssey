import { inMemoryDb } from '@app/database';
import { IActiveGame } from '@common/activeGame';
import { Schema } from 'mongoose';
import { currentAttackSchema } from './attack';
import { characterSchema } from './character';
import { gameSchema } from './game';
import { messageSchema } from './message';

const activeGameSchema = new Schema<IActiveGame>({
    game: gameSchema,
    players: [characterSchema],
    turnOrder: {
        type: [String],
        required: true,
    },
    currentPlayerIndex: {
        type: Number,
        required: true,
    },
    isFinished: {
        type: Boolean,
        required: true,
    },
    winner: {
        type: String,
        default: null,
    },
    messages: [messageSchema],
    isDebugMode: {
        type: Boolean,
        required: true,
    },
    organizerName: {
        type: String,
        required: true,
    },
    maxPlayerCount: {
        type: Number,
        required: true,
    },
    turnIsInPreparation: {
        type: Boolean,
        required: true,
    },

    currentAttack: currentAttackSchema,
});

export const activeGameModel = inMemoryDb.model<IActiveGame>('ActiveGame', activeGameSchema);
