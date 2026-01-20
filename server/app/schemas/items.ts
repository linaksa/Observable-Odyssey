import { IItem } from '@common/items';
import { Schema } from 'mongoose';


export const itemSchema = new Schema<IItem>({
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    size: { type: Number, required: true },
    itemType: { type: String, required: true },
    active: { type: Boolean },
    isCarried: { type: Boolean },
}, { _id: false });