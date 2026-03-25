import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatPanelComponent } from '@app/components/chat/chat-pannel/chat-pannel.component';
import { GameAttackComponent } from '@app/components/game/game-attack/game-attack.component';
import { GameEndedComponent } from '@app/components/game/game-ended/game-ended.component';
import { GameInfosComponent } from '@app/components/game/game-infos/game-infos.component';
import { GameComponent } from '@app/components/game/game/game.component';
import { PlayerInfoComponent } from '@app/components/game/player-info/player-info.component';
import { PlayerListComponent } from '@app/components/game/player-list/player-list.component';
import { TurnStatusComponent } from '@app/components/game/turn-status/turn-status.component';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { DebugSocketService } from '@app/services/realtime/debug.socket.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { isTypingInChatMessageInput } from '@app/utils/keyboard-shortcuts.utils';
import { ICharacter } from '@common/character';
import { TurnStatusData } from '@common/info';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { IJoinGamePayload } from '@common/socket-payloads';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-page',
    imports: [
        PlayerInfoComponent,
        GameComponent,
        PlayerListComponent,
        GameInfosComponent,
        ChatPanelComponent,
        GameAttackComponent,
        GameEndedComponent,
        TurnStatusComponent,
    ],
    providers: [GameTurnService],
    templateUrl: './game-page.component.html',
})
export class GamePageComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly debugSocketService = inject(DebugSocketService);
    private readonly socketService = inject(SocketService);
    private readonly activeGameService = inject(ActiveGameService);
    private readonly localPlayerService = inject(LocalPlayerService);
    private readonly gameTurnService = inject(GameTurnService);
    private routeSubscription?: Subscription;
    private playersSubscription?: Subscription;

    ngOnInit(): void {
        this.debugSocketService.connect();
        this.routeSubscription = this.route.params.subscribe((params) => {
            const activeGameId = params.activeGameId ?? this.activeGameService.activeGame?._id;
            if (!activeGameId) {
                return;
            }

            this.activeGameService.setActiveGame(activeGameId);

            if (!this.playersSubscription) {
                this.socketService.connect(Namespaces.Game);
                this.playersSubscription = this.socketService.on<ICharacter[]>(Namespaces.Game, SocketEvent.PlayersUpdated).subscribe({
                    next: (players) => {
                        this.activeGameService.updatePlayers(players);
                    },
                });

                this.gameTurnService.initializeTurnListeners();
            }

            this.socketService.emit<IJoinGamePayload, void>(Namespaces.Game, SocketEvent.JoinGame, {
                activeGameId,
                playerName: this.localPlayerService.getLocalPlayer()?.name,
            });
        });
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent) {
        if (isTypingInChatMessageInput(event)) return;
        if (event.key.toLowerCase() === 'm') {
            this.debugSocketService.emitDebugModeToggle(
                this.localPlayerService.getLocalPlayer()?.name ?? '',
                this.activeGameService.activeGame?._id ?? '',
            );
        }
    }

    ngOnDestroy(): void {
        this.routeSubscription?.unsubscribe();
        this.playersSubscription?.unsubscribe();
        this.gameTurnService.destroy();
    }

    get currentPlayerName(): string | null {
        return this.gameTurnService.currentPlayerName;
    }

    get turnTimeLeftSeconds(): number | null {
        return this.gameTurnService.turnTimeLeftSeconds;
    }

    get isTurnPreparing(): boolean {
        return this.gameTurnService.isTurnPreparing;
    }

    get canEndTurn(): boolean {
        return this.gameTurnService.canEndTurn;
    }

    get isGameFinished(): boolean {
        return this.activeGameService.activeGame.isFinished;
    }

    get turnStatusData(): TurnStatusData {
        return {
            currentPlayerName: this.currentPlayerName,
            turnTimeLeftSeconds: this.turnTimeLeftSeconds,
            isTurnPreparing: this.isTurnPreparing,
            canEndTurn: this.canEndTurn,
        };
    }

    endTurn(): void {
        this.gameTurnService.endTurn();
    }
}
