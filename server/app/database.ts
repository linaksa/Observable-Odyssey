import 'dotenv/config';
import mongoose from 'mongoose';

export const dbServer = mongoose.createConnection();
export const inMemoryDb = mongoose.createConnection();
