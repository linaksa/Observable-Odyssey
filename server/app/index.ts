// WARNING : Make sure to always import 'reflect-metadata' and 'module-alias/register' first
import 'module-alias/register';
import 'reflect-metadata';

import { Server } from '@app/server';
import { Container } from 'typedi';

import 'dotenv/config';
import mongoose from 'mongoose';

mongoose.connect(process.env.DATABASE_CONNECTION_STRING);

const server: Server = Container.get(Server);
server.init();
