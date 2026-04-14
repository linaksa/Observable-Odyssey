import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, input, InputSignal, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChatPanelComponent } from '@app/components/chat/chat-panel/chat-panel.component';
import { WAIT_ROOM_MIN_PLAYERS_TO_START } from '@app/constants/chat';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { extractErrorCodes, mapErrorCodesToMessage } from '@app/utils/error-codes';
import { ICharacter } from '@common/character';
import { IErrorResponse } from '@common/error-codes';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';

@Component({
    selector: 'app-wait-chat-sidebar',
    imports: [CommonModule, ChatPanelComponent],
    templateUrl: './wait-chat-sidebar.component.html',
})
export class WaitChatSidebarComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly socketService = inject(SocketService);

    readonly localPlayer: InputSignal<ICharacter | undefined> = input<ICharacter | undefined>();

    private readonly activeGameService: ActiveGameService = inject(ActiveGameService);
    protected readonly startGameError = signal<string | null>(null);

    ngOnInit(): void {
        this.socketService
            .on<IErrorResponse>(Namespaces.Game, SocketEvent.StartGameError)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (error) => {
                    this.startGameError.set(
                        mapErrorCodesToMessage(extractErrorCodes(error), 'Il y a eu un problème lors du démarrage de la partie.'),
                    );
                },
            });
    }

    get isStartDisabled(): boolean {
        const players = this.activeGameService.activeGame.players;
        return players.length < WAIT_ROOM_MIN_PLAYERS_TO_START;
    }

    get canStartGame(): boolean {
        const local = this.localPlayer();
        return !!local && local.name === this.activeGameService.activeGame?.organizerName;
    }

    startGame(): void {
        if (!this.activeGameService.activeGame._id) {
            return;
        }

        this.startGameError.set(null);
        this.socketService.emit<string, void>(Namespaces.Game, SocketEvent.StartGame, this.activeGameService.activeGame._id);
    }
}
