import { Component, effect, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatPanelComponent } from '@app/components/chat-pannel/chat-pannel.component';
import { GameInfosComponent } from '@app/components/game/game-infos/game-infos.component';
import { GameComponent } from '@app/components/game/game/game.component';
import { PlayerInfoComponent } from '@app/components/game/player-info/player-info.component';
import { PlayerListComponent } from '@app/components/game/player-list/player-list.component';
import { ActiveGameService } from '@app/services/active-game.service';
import { DebugSocketService } from '@app/services/debug.socket.service';
import { LocalPlayerService } from '@app/services/local-player.service';
import { SocketService } from '@app/services/socket.service';
import { ICharacter } from '@common/character';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-page',
    imports: [PlayerInfoComponent, GameComponent, PlayerListComponent, GameInfosComponent, ChatPanelComponent],
    templateUrl: './game-page.component.html',
})
export class GamePageComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly debugSocketService = inject(DebugSocketService);
    private readonly socketService = inject(SocketService);
    private readonly activeGameService = inject(ActiveGameService);
    private readonly localPlayerService = inject(LocalPlayerService);
    private routeSubscription?: Subscription;
    private playersSubscription?: Subscription;

    constructor() {
        effect(() => {
            if (!this.activeGameService.isLoading()) {
                this.localPlayerService.restoreFromActiveGame(this.activeGameService.activeGame);
            }
        });
    }

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
            }

            this.socketService.emit<string, void>(Namespaces.Game, SocketEvent.JoinGame, activeGameId);
        });
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent) {
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
        this.socketService.disconnect(Namespaces.Game);
    }
}
