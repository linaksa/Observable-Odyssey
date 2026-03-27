import { Component, effect, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoadingOverlayComponent } from '@app/components/common/loading-overlay/loading-overlay.component';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { VirtualPlayerDialogComponent } from '@app/components/wait/virtual-player-dialog/virtual-player-dialog.component';
import { WaitChatSidebarComponent } from '@app/components/wait/wait-chat-sidebar/wait-chat-sidebar.component';
import { WaitGameGridComponent } from '@app/components/wait/wait-game-grid/wait-game-grid.component';
import { WaitPlayerListComponent } from '@app/components/wait/wait-player-list/wait-player-list.component';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { WaitGridService } from '@app/services/lobby/wait-grid.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ICharacter } from '@common/character';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { IJoinGamePayload } from '@common/socket-payloads';
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
        VirtualPlayerDialogComponent,
    ],
    templateUrl: './wait-page.component.html',
})
export class WaitPageComponent implements OnInit, OnDestroy {
    isVirtualPlayerDialogOpen = signal<boolean>(false);
    private readonly socketService = inject(SocketService);
    private readonly router = inject(Router);
    private readonly route: ActivatedRoute = inject(ActivatedRoute);
    private readonly localPlayerService: LocalPlayerService = inject(LocalPlayerService);
    private readonly timeout: number = 3000;

    private playersUpdatedSubscription?: Subscription;
    private startGameSubscription?: Subscription;
    private gameEndedSubscription?: Subscription;
    private routeSubscription?: Subscription;
    private buttonTimeoutId?: ReturnType<typeof setTimeout>;
    private gameStarted: boolean = false;
    private hasLeftWaitingRoom: boolean = false;

    protected readonly activeGameService: ActiveGameService = inject(ActiveGameService);
    protected readonly waitGridService: WaitGridService = inject(WaitGridService);

    localPlayer?: ICharacter;
    showButton: boolean = false;

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
            this.initializeWaitingRoom(params.activeGameId);
        });
    }

    ngOnDestroy(): void {
        this.handlePageExit();
        this.clearButtonTimeout();
        this.unsubscribeAll();
    }

    @HostListener('window:beforeunload')
    onBeforeUnload(): void {
        this.handlePageExit();
    }

    goBack(): void {
        this.handlePageExit();
    }

    private initializeWaitingRoom(activeGameId: string): void {
        this.socketService.connect(Namespaces.Game);
        this.socketService.emit<IJoinGamePayload, void>(Namespaces.Game, SocketEvent.JoinGame, {
            activeGameId,
            playerName: this.localPlayerService.getLocalPlayer()?.name,
        });
        this.activeGameService.setActiveGame(activeGameId);
        this.subscribeToPlayersUpdated();
        this.subscribeToGameStarted();
        this.subscribeToGameEnded();
    }

    private subscribeToPlayersUpdated(): void {
        this.playersUpdatedSubscription?.unsubscribe();
        this.playersUpdatedSubscription = this.socketService.on<ICharacter[]>(Namespaces.Game, SocketEvent.PlayersUpdated).subscribe({
            next: (players) => {
                this.activeGameService.updatePlayers(players);
                this.initializeActiveGameData();
            },
        });
    }

    private subscribeToGameStarted(): void {
        this.startGameSubscription?.unsubscribe();
        this.startGameSubscription = this.socketService.on<string>(Namespaces.Game, SocketEvent.GameStarted).subscribe({
            next: (startedGameId) => {
                if (!startedGameId || startedGameId !== this.activeGameService.activeGame._id) {
                    return;
                }
                this.gameStarted = true;
                this.router.navigate(['/play', startedGameId]);
            },
        });
    }

    private subscribeToGameEnded(): void {
        this.gameEndedSubscription?.unsubscribe();
        this.gameEndedSubscription = this.socketService.on<{ winner: string | null }>(Namespaces.Game, SocketEvent.GameEnded).subscribe({
            next: () => {
                this.localPlayerService.clear();
                this.router.navigate(['/home']);
            },
        });
    }

    private handlePageExit(): void {
        if (this.gameStarted) {
            return;
        }

        if (this.hasLeftWaitingRoom) {
            return;
        }

        const localPlayerName = this.getLocalPlayerName();
        const activeGameId = this.activeGameService.activeGame?._id;

        if (!localPlayerName || !activeGameId) {
            return;
        }

        this.kickOtherPlayersIfOrganizer(localPlayerName);

        this.leaveWaitingRoomAndCleanup(localPlayerName);
    }

    private kickOtherPlayersIfOrganizer(localPlayerName: string): void {
        const activeGame = this.activeGameService.activeGame;
        if (!activeGame || activeGame.organizerName !== localPlayerName) {
            return;
        }

        for (const player of activeGame.players) {
            if (player.name !== localPlayerName) {
                this.activeGameService.kickPlayer(player.name);
            }
        }
    }

    private getLocalPlayerName(): string | undefined {
        return this.localPlayer?.name ?? this.localPlayerService.getLocalPlayer()?.name;
    }

    private leaveWaitingRoomAndCleanup(localPlayerName: string): void {
        this.hasLeftWaitingRoom = true;
        this.activeGameService.leaveWaitingRoom(localPlayerName);
        this.localPlayerService.clear();
    }

    private initializeActiveGameData(): void {
        if (!this.activeGameService.activeGame || !this.activeGameService.activeGame.game) {
            return;
        }

        this.waitGridService.buildGrid(this.activeGameService.activeGame.game.board.cells.length);
        this.waitGridService.initFromExistingBoard(structuredClone(this.activeGameService.activeGame));

        this.localPlayer = this.localPlayerService.getLocalPlayer();

        if (!this.localPlayer) {
            this.router.navigate(['/error']);
            return;
        }
    }

    private initializeButtonTimeout(): void {
        this.buttonTimeoutId = setTimeout(() => {
            this.showButton = true;
        }, this.timeout);
    }

    private clearButtonTimeout(): void {
        if (!this.buttonTimeoutId) {
            return;
        }

        clearTimeout(this.buttonTimeoutId);
        this.buttonTimeoutId = undefined;
    }

    private unsubscribeAll(): void {
        this.routeSubscription?.unsubscribe();
        this.playersUpdatedSubscription?.unsubscribe();
        this.startGameSubscription?.unsubscribe();
        this.gameEndedSubscription?.unsubscribe();
    }
}
