import { inject, Injectable, OnDestroy } from '@angular/core';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { IMessage, INewMessage } from '@common/message';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Subscription } from 'rxjs';
import { SocketService } from './socket.service';

@Injectable({
    providedIn: 'root',
})
export class ChatService implements OnDestroy {
    private readonly socketService = inject(SocketService);
    private readonly activeGameService = inject(ActiveGameService);
    private readonly localPlayerService = inject(LocalPlayerService);
    private chatSubscription?: Subscription;

    connect() {
        this.disconnect();
        this.socketService.connect(Namespaces.Game);
        const activeGameId = this.activeGameService.activeGame._id;

        this.socketService.emit<string, IMessage[]>(Namespaces.Game, SocketEvent.JoinChat, activeGameId, (response) => {
            if (this.activeGameService.activeGame?._id !== activeGameId) {
                return;
            }

            this.activeGameService.setChatMessages(response);
        });
        this.chatSubscription = this.socketService.on<IMessage>(Namespaces.Game, SocketEvent.NewMessage).subscribe({
            next: (message: IMessage) => {
                if (this.activeGameService.activeGame?._id !== activeGameId) {
                    return;
                }

                this.activeGameService.appendChatMessage(message);
            },
        });
    }

    sendMessage(content: string) {
        // object for saving to db
        const newMessage: INewMessage = {
            content,
            roomId: this.activeGameService.activeGame._id,
            author: this.localPlayerService.getLocalPlayer()?.name ?? 'ERROR',
        };
        // object for sending to display onscreen
        const message: IMessage = {
            content,
            author: this.localPlayerService.getLocalPlayer()?.name ?? 'ERROR',
            postedAt: new Date(),
        };
        this.socketService.emit<INewMessage, unknown>(Namespaces.Game, SocketEvent.NewMessage, newMessage);
        this.activeGameService.appendChatMessage(message);
    }

    disconnect(): void {
        this.chatSubscription?.unsubscribe();
        this.chatSubscription = undefined;
    }

    ngOnDestroy(): void {
        this.disconnect();
    }
}
