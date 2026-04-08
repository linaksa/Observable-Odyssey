import { inMemoryDb } from '@app/database';
import { IActiveGame } from '@common/activeGame';
import { MILLISECONDS_PER_SECOND } from '@common/constants';
import { Schema } from 'mongoose';
import { currentAttackSchema } from './attack';
import { characterSchema } from './character';
import { gameSchema } from './game';
import { messageSchema } from './message';

export const ACTIVE_GAME_TTL_SECONDS = Date.parse('1970-01-01T01:00:00.000Z') / MILLISECONDS_PER_SECOND;

const activeGameSchema = new Schema<IActiveGame>({
    createdAt: {
        type: Date,
        default: Date.now,
    },
    startedAt: {
        type: Date,
        default: null,
    },
    endedAt: {
        type: Date,
        default: null,
    },
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
    hasFlagId: {
        type: String,
        default: null,
    },
    turnStartTimeStamp: {
        type: Number,
        default: 0,
    },
    totalTurnCount: {
        type: Number,
        default: 0,
    },
    usedSanctuaries: {
        type: [String],
        default: [],
    },
    manipulatedDoors: {
        type: [String],
        default: [],
    },
    flagHolderHistory: {
        type: [String],
        default: [],
    },

    currentAttack: currentAttackSchema,
});

activeGameSchema.index({ createdAt: 1 }, { expireAfterSeconds: ACTIVE_GAME_TTL_SECONDS });

export const activeGameModel = inMemoryDb.model<IActiveGame>('ActiveGame', activeGameSchema);
