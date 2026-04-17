/**
 * Testing strategy — GameSocketConnectionService
 *
 * Approach:
 * - Instantiate the service with fully stubbed dependencies and call register once.
 * - Verify each collaborator receives the same socket/namespace arguments in delegation order.
 *
 * Edge cases covered:
 * - Single orchestration path: ensures no dependency registration call is skipped.
 */
import { ChatService } from '@app/services/realtime/chat.service';
import { DebugSocketService } from '@app/services/realtime/debug-socket.service';
import { GameSocketConnectionService } from '@app/services/realtime/game-socket-connection.service';
import { GameSocketGameplayEventsService } from '@app/services/realtime/game-socket-gameplay-events.service';
import { GameSocketSessionEventsService } from '@app/services/realtime/game-socket-session-events.service';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Namespace, Socket } from 'socket.io';

describe('Game Socket Connection', () => {
    it('register delegates to chat, debug, session and gameplay services', () => {
        const chatService = { register: sinon.stub() };
        const debugSocketService = { register: sinon.stub() };
        const gameSocketSessionEventsService = { register: sinon.stub() };
        const gameSocketGameplayEventsService = { register: sinon.stub() };
        const socket = {} as Socket;
        const namespace = {} as Namespace;

        const service = new GameSocketConnectionService(
            chatService as unknown as ChatService,
            debugSocketService as unknown as DebugSocketService,
            gameSocketSessionEventsService as unknown as GameSocketSessionEventsService,
            gameSocketGameplayEventsService as unknown as GameSocketGameplayEventsService,
        );

        service.register(socket, namespace);

        expect(chatService.register.calledOnceWithExactly(socket)).to.equal(true);
        expect(debugSocketService.register.calledOnceWithExactly(socket)).to.equal(true);
        expect(gameSocketSessionEventsService.register.calledOnceWithExactly(socket, namespace)).to.equal(true);
        expect(gameSocketGameplayEventsService.register.calledOnceWithExactly(socket, namespace)).to.equal(true);
    });
});
