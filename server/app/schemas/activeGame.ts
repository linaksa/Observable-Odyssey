import { model, Schema, Types } from 'mongoose';
import { characterSchema, ICharacter } from './character';
import { IItem, itemSchema } from './items';

export interface IActiveGame {
    baseGameId: Types.ObjectId,
    players: ICharacter[],
    itemsState: IItem[],
};

const activeGameSchema = new Schema<IActiveGame>({
    baseGameId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    players: [characterSchema],
    itemsState: [itemSchema],
});

export const activeGame = model<IActiveGame>('ActiveGame', activeGameSchema);