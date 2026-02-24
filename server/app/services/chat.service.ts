import { INewMessage } from '@common/message';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Namespace } from 'socket.io';
import { Service } from 'typedi';
import { ActiveGameService } from './active-game.service';
import { SocketService } from './socket.service';

@Service()
export class ChatService {
    private namespace?: Namespace;

    constructor(
        private readonly socketService: SocketService,
        private readonly activeGameService: ActiveGameService,
    ) {}

    initialize() {
        this.namespace = this.socketService.createNamespace(Namespaces.Chat);
        this.namespace.on('connection', (socket) => {
            socket.on(SocketEvent.JoinChat, (roomId: string) => {
                socket.join(roomId);
                socket.on(SocketEvent.NewMessage, (newMessage: INewMessage) => {
                    this.activeGameService.addMessageToGame(newMessage);
                    socket.broadcast.emit(SocketEvent.NewMessage, newMessage);
                });
            });
        });
    }
}
