// WARNING : Make sure to always import 'reflect-metadata' and 'module-alias/register' first
import 'module-alias/register';
import 'reflect-metadata';

import { Server } from '@app/server';
import { Container } from 'typedi';

import { MongoMemoryServer } from 'mongodb-memory-server';
import { dbServer, inMemoryDb } from '@app/database';

async function startServer() {
    const atlasConnectionString = process.env.DATABASE_CONNECTION_STRING;
    if (!atlasConnectionString) {
        throw new Error('DATABASE_CONNECTION_STRING is required');
    }

    const localInMemoryConnectionString = process.env.IN_MEMORY_DATABASE_CONNECTION_STRING;
    const useMongoMemoryServer = process.env.USE_MONGO_MEMORY_SERVER === 'true';

    await dbServer.openUri(atlasConnectionString);

    if (localInMemoryConnectionString && !useMongoMemoryServer) {
        await inMemoryDb.openUri(localInMemoryConnectionString);
    } else if (useMongoMemoryServer) {
        const mongoMemoryServerInstance = await MongoMemoryServer.create();
        await inMemoryDb.openUri(mongoMemoryServerInstance.getUri());
    } else {
        throw new Error('IN_MEMORY_DATABASE_CONNECTION_STRING is required when USE_MONGO_MEMORY_SERVER is not true');
    }

    const server: Server = Container.get(Server);
    server.init();
}
startServer();
