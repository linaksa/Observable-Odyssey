// WARNING : Make sure to always import 'reflect-metadata' and 'module-alias/register' first
import 'module-alias/register';
import 'reflect-metadata';

import { Server } from '@app/server';
import { Container } from 'typedi';

import { MongoMemoryServer } from 'mongodb-memory-server';
import { dbServer, inMemoryDb } from './database';

async function startServer() {
    const mongoMemoryServerInstance = await MongoMemoryServer.create();
    const mongoUri = mongoMemoryServerInstance.getUri();
    await inMemoryDb.openUri(mongoUri);
    await dbServer.asPromise();

    const server: Server = Container.get(Server);
    server.init();
}
startServer();
