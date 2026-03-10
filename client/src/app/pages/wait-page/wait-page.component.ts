import { Component, effect, inject, input, InputSignal, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoadingOverlayComponent } from '@app/components/common/loading-overlay/loading-overlay.component';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { WaitChatSidebarComponent } from '@app/components/wait/wait-chat-sidebar/wait-chat-sidebar.component';
import { WaitGameGridComponent } from '@app/components/wait/wait-game-grid/wait-game-grid.component';
import { WaitPlayerListComponent } from '@app/components/wait/wait-player-list/wait-player-list.component';
import { ActiveGameService } from '@app/services/active-game.service';
import { LocalPlayerService } from '@app/services/local-player.service';
import { SocketService } from '@app/services/socket.service';
import { WaitGridService } from '@app/services/wait-grid.service';
import { ICharacter } from '@common/character';
import { IExistingGame } from '@common/game';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-wait-page',
    imports: [
        NavButtonsComponent,
        PageTitleComponent,
        LoadingOverlayComponent,
        WaitPlayerListComponent,
        WaitGameGridComponent,
        WaitChatSidebarComponent,
        RouterLink,
    ],
    templateUrl: './wait-page.component.html',
})
export class WaitPageComponent implements OnInit, OnDestroy {
    private readonly socketService = inject(SocketService);
    private readonly router = inject(Router);
    private readonly route: ActivatedRoute = inject(ActivatedRoute);
    private readonly localPlayerService: LocalPlayerService = inject(LocalPlayerService);
    private readonly timeout: number = 3000;

    private playersUpdatedSubscription?: Subscription;
    private startGameSubscription?: Subscription;
    private routeSubscription?: Subscription;

    readonly gameToEdit: InputSignal<IExistingGame> = input.required<IExistingGame>();
    protected readonly activeGameService: ActiveGameService = inject(ActiveGameService);
    protected readonly waitGridService: WaitGridService = inject(WaitGridService);

    localPlayer?: ICharacter;
    showButton: boolean = false;
    private gameStarted: boolean = false;

    constructor() {
        effect(() => {
            if (!this.activeGameService.isLoading()) {
                this.initializeActiveGameData();
            }
        });
    }

    ngOnInit(): void {
        this.initializeButtonTimeout();

        this.routeSubscription = this.route.params.subscribe((params) => {
            this.socketService.connect(Namespaces.Game);
            this.socketService.emit<string, void>(Namespaces.Game, SocketEvent.JoinGame, params.activeGameId);
            this.activeGameService.setActiveGame(params.activeGameId);
            this.playersUpdatedSubscription?.unsubscribe();
            this.playersUpdatedSubscription = this.socketService.on<ICharacter[]>(Namespaces.Game, SocketEvent.PlayersUpdated).subscribe({
                next: (players) => {
                    this.activeGameService.updatePlayers(players);
                    this.initializeActiveGameData();
                },
            });
            this.startGameSubscription?.unsubscribe();
            this.startGameSubscription = this.socketService.on<string>(Namespaces.Game, SocketEvent.StartGame).subscribe({
                next: (startedGameId) => {
                    if (!startedGameId || startedGameId !== this.activeGameService.activeGame._id) {
                        return;
                    }
                    this.gameStarted = true;
                    this.router.navigate(['/play', startedGameId]);
                },
            });
        });
    }

    ngOnDestroy(): void {
        this.routeSubscription?.unsubscribe();
        this.playersUpdatedSubscription?.unsubscribe();
        this.startGameSubscription?.unsubscribe();

        if (this.gameStarted) {
            return;
        }

        const localPlayerName = this.localPlayer?.name;
        const activeGameId = this.activeGameService.activeGame?._id;

        if (!localPlayerName || !activeGameId) {
            return;
        }

        this.activeGameService.leaveActiveGame(localPlayerName).subscribe({
            complete: () => this.localPlayerService.clear(),
        });
    }

    private initializeActiveGameData(): void {
        if (!this.activeGameService.activeGame || !this.activeGameService.activeGame.game) {
            return;
        }

        this.waitGridService.buildGrid(this.activeGameService.activeGame.game.board.cells.length);
        this.waitGridService.initFromExistingBoard(structuredClone(this.activeGameService.activeGame));

        this.localPlayerService.restoreFromActiveGame(this.activeGameService.activeGame);
        this.localPlayer = this.localPlayerService.getLocalPlayer();
    }

    private initializeButtonTimeout(): void {
        setTimeout(() => {
            this.showButton = true;
        }, this.timeout);
    }
}
