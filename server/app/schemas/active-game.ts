import { inMemoryDb } from '@app/database';
import { IActiveGame } from '@common/activeGame';
import { Schema } from 'mongoose';
import { characterSchema } from './character';
import { gameSchema } from './game';
import { itemSchema } from './items';
import { messageSchema } from './message';

const activeGameSchema = new Schema<IActiveGame>({
    game: gameSchema,
    players: [characterSchema],
    itemsState: [itemSchema],
    currentPlayerIndex: {
        type: Number,
        required: true,
    },
    messages: [messageSchema],
});

export const activeGame = inMemoryDb.model<IActiveGame>('ActiveGame', activeGameSchema);
