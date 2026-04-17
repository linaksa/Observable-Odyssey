/**
 * Testing strategy — ChatService
 *
 * Approach:
 * - Register handlers once, then trigger JoinChat/NewMessage callbacks with realistic payloads.
 * - Assert room joins, message persistence, and room broadcasts through socket stubs.
 *
 * Edge cases covered:
 * - Legacy string JoinChat payloads still work when no player metadata is provided.
 * - JoinChat payloads without a roomId fall back to an empty room id.
 * - Rejoining another room removes the previous NewMessage listener before attaching a new one.
 */
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { ChatService } from '@app/services/realtime/chat.service';
import { GameSessionService } from '@app/services/realtime/game-session.service';
import { IMessage } from '@common/message';
import { SocketEvent } from '@common/socket-events';
import { IJoinChatPayload, ISocketData } from '@common/socket-payloads';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Socket } from 'socket.io';

describe('ChatService', () => {
    let service: ChatService;
    let activeGameService: {
        addMessageToGame: sinon.SinonStub;
        getMessagesFromGame: sinon.SinonStub;
    };
    let gameSessionService: {
        setSocketPlayerName: sinon.SinonStub;
    };
    let socket: Socket;
    let handlers: Map<string, (...args: unknown[]) => unknown>;
    let roomEmitStub: sinon.SinonStub;

    beforeEach(() => {
        activeGameService = {
            addMessageToGame: sinon.stub(),
            getMessagesFromGame: sinon.stub(),
        };
        gameSessionService = {
            setSocketPlayerName: sinon.stub(),
        };
        handlers = new Map<string, (...args: unknown[]) => unknown>();
        roomEmitStub = sinon.stub();
        socket = {
            data: {},
            join: sinon.stub(),
            off: sinon.stub(),
            on: sinon.stub().callsFake((event: string, handler: (...args: unknown[]) => unknown) => {
                handlers.set(event, handler);
            }),
            to: sinon.stub().returns({ emit: roomEmitStub }),
        } as unknown as Socket;

        service = new ChatService(activeGameService as unknown as ActiveGameService, gameSessionService as unknown as GameSessionService);
        service.register(socket);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('registers socket player name for GC counting when JoinChat receives payload with playerName', async () => {
        // Nominal case: object payload includes playerName, so socket session mapping is updated.
        const roomId = 'active-game-1';
        const playerName = 'Alice';
        const joinHandler = handlers.get(SocketEvent.JoinChat) as (
            payload: string | IJoinChatPayload,
            callback: (messages: IMessage[]) => void,
        ) => Promise<void>;
        const callback = sinon.stub();
        const messages: IMessage[] = [{ postedAt: new Date('2026-01-01T10:00:00.000Z'), content: 'Bonjour', author: 'Alice' }];
        activeGameService.getMessagesFromGame.resolves(messages);
        gameSessionService.setSocketPlayerName.callsFake((targetSocket: Socket, gameId: string, name: string) => {
            GameSessionService.prototype.setSocketPlayerName(targetSocket, gameId, name);
        });

        await joinHandler({ roomId, playerName }, callback);

        expect((socket.join as sinon.SinonStub).calledOnceWithExactly(roomId)).to.equal(true);
        expect(gameSessionService.setSocketPlayerName.calledOnceWithExactly(socket, roomId, playerName)).to.equal(true);
        expect((socket.data as ISocketData).playerNamesByGameId?.[roomId]).to.equal(playerName);
        expect(callback.calledOnceWithExactly(messages)).to.equal(true);
    });

    it('keeps supporting legacy string JoinChat payloads', async () => {
        // Edge case: legacy payload does not carry playerName, so only room join and callback should run.
        const roomId = 'active-game-2';
        const joinHandler = handlers.get(SocketEvent.JoinChat) as (
            payload: string | IJoinChatPayload,
            callback: (messages: IMessage[]) => void,
        ) => Promise<void>;
        const callback = sinon.stub();
        const messages: IMessage[] = [];
        activeGameService.getMessagesFromGame.resolves(messages);

        await joinHandler(roomId, callback);

        expect((socket.join as sinon.SinonStub).calledOnceWithExactly(roomId)).to.equal(true);
        expect(gameSessionService.setSocketPlayerName.called).to.equal(false);
        expect(callback.calledOnceWithExactly(messages)).to.equal(true);
    });

    it('falls back to an empty room id when JoinChat payload is missing roomId — Edge case', async () => {
        // Edge case: an object payload without roomId should still be parsed safely.
        const joinHandler = handlers.get(SocketEvent.JoinChat) as (
            payload: string | IJoinChatPayload,
            callback: (messages: IMessage[]) => void,
        ) => Promise<void>;
        const callback = sinon.stub();
        const messages: IMessage[] = [];
        activeGameService.getMessagesFromGame.resolves(messages);

        await joinHandler({} as never, callback);

        expect((socket.join as sinon.SinonStub).calledOnceWithExactly('')).to.equal(true);
        expect(gameSessionService.setSocketPlayerName.called).to.equal(false);
        expect(callback.calledOnceWithExactly(messages)).to.equal(true);
    });

    it('removes previous NewMessage listener when joining another room', async () => {
        const joinHandler = handlers.get(SocketEvent.JoinChat) as (
            payload: string | IJoinChatPayload,
            callback: (messages: IMessage[]) => void,
        ) => Promise<void>;
        activeGameService.getMessagesFromGame.resolves([]);

        await joinHandler({ roomId: 'room-1', playerName: 'Alice' }, sinon.stub());
        await joinHandler({ roomId: 'room-2', playerName: 'Alice' }, sinon.stub());

        expect((socket.off as sinon.SinonStub).calledWithExactly(SocketEvent.NewMessage, sinon.match.func)).to.equal(true);
    });

    it('broadcasts new messages to room and stores them', async () => {
        const joinHandler = handlers.get(SocketEvent.JoinChat) as (
            payload: string | IJoinChatPayload,
            callback: (messages: IMessage[]) => void,
        ) => Promise<void>;
        activeGameService.getMessagesFromGame.resolves([]);

        await joinHandler({ roomId: 'room-1', playerName: 'Alice' }, sinon.stub());
        const newMessageHandler = handlers.get(SocketEvent.NewMessage) as (payload: { roomId: string; content: string; author: string }) => void;
        const newMessage = { roomId: 'room-1', content: 'Salut', author: 'Alice' };
        newMessageHandler(newMessage);

        expect(activeGameService.addMessageToGame.calledOnceWithExactly(newMessage)).to.equal(true);
        expect(roomEmitStub.calledOnceWithExactly(SocketEvent.NewMessage, sinon.match.has('content', 'Salut'))).to.equal(true);
    });
});
