import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoadingOverlayComponent } from '@app/components/loading-overlay/loading-overlay.component';

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
export class WaitPageComponent {
    timeout: number = 0;
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
