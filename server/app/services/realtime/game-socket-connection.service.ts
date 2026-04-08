import { ChatService } from '@app/services/realtime/chat.service';
import { DebugSocketService } from '@app/services/realtime/debug-socket.service';
import { GameSocketGameplayEventsService } from '@app/services/realtime/game-socket-gameplay-events.service';
import { GameSocketSessionEventsService } from '@app/services/realtime/game-socket-session-events.service';
import { Namespace, Socket } from 'socket.io';
import { Service } from 'typedi';

@Service()
export class GameSocketConnectionService {
    constructor(
        private readonly chatService: ChatService,
        private readonly debugSocketService: DebugSocketService,
        private readonly gameSocketSessionEventsService: GameSocketSessionEventsService,
        private readonly gameSocketGameplayEventsService: GameSocketGameplayEventsService,
    ) {}

    register(socket: Socket, namespace: Namespace): void {
        this.chatService.register(socket);
        this.debugSocketService.register(socket);
        this.gameSocketSessionEventsService.register(socket, namespace);
        this.gameSocketGameplayEventsService.register(socket, namespace);
    }
}
