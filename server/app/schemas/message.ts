import { IMessage } from '@common/message';
import { Schema } from 'mongoose';

export const messageSchema = new Schema<IMessage>({
    author: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    postedAt: {
        type: Date,
        required: true,
    },
});
