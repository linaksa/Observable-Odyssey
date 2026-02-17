import 'dotenv/config';
import mongoose from 'mongoose';

export const dbServer = mongoose.createConnection(process.env.DATABASE_CONNECTION_STRING ?? '');
export const inMemoryDb = mongoose.createConnection();
