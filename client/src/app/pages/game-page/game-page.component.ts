import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatPanelComponent } from '@app/components/chat-pannel/chat-pannel.component';
import { GameInfosComponent } from '@app/components/game/game-infos/game-infos.component';
import { GameComponent } from '@app/components/game/game/game.component';
import { PlayerInfoComponent } from '@app/components/game/player-info/player-info.component';
import { PlayerListComponent } from '@app/components/game/player-list/player-list.component';
import { ActiveGameService } from '@app/services/active-game.service';
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
    private readonly socketService = inject(SocketService);
    private readonly activeGameService = inject(ActiveGameService);
    private routeSubscription?: Subscription;
    private playersSubscription?: Subscription;

    ngOnInit(): void {
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
                        // eslint-disable-next-line no-console
                        console.log('PlayersUpdated:', players);
                    },
                });
            }

            this.socketService.emit<string, void>(Namespaces.Game, SocketEvent.JoinGame, activeGameId);
        });
    }

    ngOnDestroy(): void {
        this.routeSubscription?.unsubscribe();
        this.playersSubscription?.unsubscribe();
        this.socketService.disconnect(Namespaces.Game);
    }
}