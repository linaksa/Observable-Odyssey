import { CommonModule } from '@angular/common';
import { Component, inject, input, InputSignal } from '@angular/core';
import { ChatPanelComponent } from '@app/components/chat/chat-pannel/chat-pannel.component';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ICharacter } from '@common/character';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';

@Component({
    selector: 'app-wait-chat-sidebar',
    imports: [CommonModule, ChatPanelComponent],
    templateUrl: './wait-chat-sidebar.component.html',
})
export class WaitChatSidebarComponent {
    private readonly socketService = inject(SocketService);

    readonly localPlayer: InputSignal<ICharacter | undefined> = input<ICharacter | undefined>();

    private readonly activeGameService: ActiveGameService = inject(ActiveGameService);

    get isStartDisabled(): boolean {
        const players = this.activeGameService.activeGame.players;
        return players.length < 2;
    }

    get canStartGame(): boolean {
        const local = this.localPlayer();
        return !!local && local.name === this.activeGameService.activeGame?.organizerName;
    }

    startGame(): void {
        if (!this.activeGameService.activeGame._id) {
            return;
        }

        this.socketService.emit<string, void>(Namespaces.Game, SocketEvent.StartGame, this.activeGameService.activeGame._id);
    }
}
