import { ICharacter } from '@common/ICharacter';
import { IItem } from '@common/items';
import { model, Schema, Types } from 'mongoose';
import { characterSchema } from './character';
import { itemSchema } from './items';

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
