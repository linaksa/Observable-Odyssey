import { IActiveGame } from '@common/activeGame';
import { model, Schema } from 'mongoose';
import { characterSchema } from './character';
import { gameSchema } from './game';
import { itemSchema } from './items';

const activeGameSchema = new Schema<IActiveGame>({
    game: gameSchema,
    players: [characterSchema],
    itemsState: [itemSchema],
});

export const activeGame = model<IActiveGame>('ActiveGame', activeGameSchema);