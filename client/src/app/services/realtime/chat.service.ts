import { inject, Injectable, OnDestroy } from '@angular/core';
import { IMessage, INewMessage } from '@common/message';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Subscription } from 'rxjs';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from './socket.service';

@Injectable({
    providedIn: 'root',
})
export class ChatService implements OnDestroy {
    private readonly socketService = inject(SocketService);
    private readonly activeGameService = inject(ActiveGameService);
    private readonly localPlayerService = inject(LocalPlayerService);
    private chatSubscription: Subscription;
    connect() {
        this.chatSubscription?.unsubscribe();
        this.socketService.connect(Namespaces.Game);
        this.socketService.emit<string, IMessage[]>(Namespaces.Game, SocketEvent.JoinChat, this.activeGameService.activeGame._id, (response) => {
            this.activeGameService.activeGame.messages = response;
        });
        this.chatSubscription = this.socketService.on<IMessage>(Namespaces.Game, SocketEvent.NewMessage).subscribe({
            next: (message: IMessage) => {
                this.activeGameService.activeGame.messages.push(message);
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
        this.activeGameService.activeGame.messages.push(message);
    }

    ngOnDestroy(): void {
        this.chatSubscription?.unsubscribe();
    }
}
