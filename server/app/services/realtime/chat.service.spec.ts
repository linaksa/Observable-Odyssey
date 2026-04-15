/**
 * Testing strategy — ChatService
 *
 * - Verify JoinChat payload parsing supports legacy string and object payloads.
 * - Verify playerName in JoinChat payload is registered on socket session data.
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

    beforeEach(() => {
        activeGameService = {
            addMessageToGame: sinon.stub(),
            getMessagesFromGame: sinon.stub(),
        };
        gameSessionService = {
            setSocketPlayerName: sinon.stub(),
        };
        handlers = new Map<string, (...args: unknown[]) => unknown>();
        socket = {
            data: {},
            join: sinon.stub(),
            off: sinon.stub(),
            on: sinon.stub().callsFake((event: string, handler: (...args: unknown[]) => unknown) => {
                handlers.set(event, handler);
            }),
            to: sinon.stub().returns({ emit: sinon.stub() }),
        } as unknown as Socket;

        service = new ChatService(activeGameService as unknown as ActiveGameService, gameSessionService as unknown as GameSessionService);
        service.register(socket);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('registers socket player name for GC counting when JoinChat receives payload with playerName', async () => {
        // Nominal case
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
        // Edge case
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
});
