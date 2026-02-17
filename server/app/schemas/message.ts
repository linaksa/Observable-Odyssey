import { IMessage } from '@common/message';
import { Schema } from 'mongoose';

export const messageSchema = new Schema<IMessage>();
