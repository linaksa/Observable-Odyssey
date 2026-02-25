import { inject, Injectable } from '@angular/core';
import { IMessage, INewMessage } from '@common/message';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { ActiveGameService } from './active-game.service';
import { SocketService } from './socket.service';

@Injectable({
    providedIn: 'root',
})
export class ChatService {
    private readonly socketService = inject(SocketService);
    private readonly activeGameService = inject(ActiveGameService);

    connect() {
        this.socketService.connect(Namespaces.Chat);
        this.socketService.emit<string, IMessage[]>(Namespaces.Chat, SocketEvent.JoinChat, this.activeGameService.activeGame._id, (response) => {
            this.activeGameService.activeGame.messages = response;
        });
        this.socketService.on<IMessage>(Namespaces.Chat, SocketEvent.NewMessage).subscribe({
            next: (message: IMessage) => {
                this.activeGameService.activeGame.messages.push(message);
            },
        });
    }

    sendMessage(content: string) {
        const newMessage: INewMessage = {
            content,
            roomId: this.activeGameService.activeGame._id,
            author: 'PLACEHOLDER',
        };
        const message: IMessage = {
            content,
            author: 'PLACEHOLDER',
            postedAt: new Date(),
        };
        this.socketService.emit<INewMessage, unknown>(Namespaces.Chat, SocketEvent.NewMessage, newMessage);
        this.activeGameService.activeGame.messages.push(message);
    }
}
