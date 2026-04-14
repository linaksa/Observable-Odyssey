import { Component, DestroyRef, effect, HostListener, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { LoadingOverlayComponent } from '@app/components/common/loading-overlay/loading-overlay.component';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { VirtualPlayerDialogComponent } from '@app/components/wait/virtual-player-dialog/virtual-player-dialog.component';
import { WaitChatSidebarComponent } from '@app/components/wait/wait-chat-sidebar/wait-chat-sidebar.component';
import { WaitGameGridComponent } from '@app/components/wait/wait-game-grid/wait-game-grid.component';
import { WaitPlayerListComponent } from '@app/components/wait/wait-player-list/wait-player-list.component';
import { WaitPageFacadeService } from '@app/services/lobby/wait-page.facade.service';
import { ICharacter } from '@common/character';
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
    private readonly facade = inject(WaitPageFacadeService);
    private readonly router = inject(Router);
    private readonly route: ActivatedRoute = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly timeout: number = 3000;

    private playersUpdatedSubscription?: Subscription;
    private startGameSubscription?: Subscription;
    private gameEndedSubscription?: Subscription;
    private routeSubscription?: Subscription;
    private buttonTimeoutId?: ReturnType<typeof setTimeout>;
    private gameStarted: boolean = false;
    private hasLeftWaitingRoom: boolean = false;

    protected readonly activeGameService = this.facade.activeGameService;

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

        this.routeSubscription = this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
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
        this.facade.connectAndJoinWaitingRoom(activeGameId);
        this.subscribeToPlayersUpdated();
        this.subscribeToGameStarted();
        this.subscribeToGameEnded();
    }

    private subscribeToPlayersUpdated(): void {
        this.playersUpdatedSubscription?.unsubscribe();
        this.playersUpdatedSubscription = this.facade.onPlayersUpdated().subscribe({
            next: (players) => {
                this.facade.updatePlayers(players);
                this.initializeActiveGameData();
            },
        });
    }

    private subscribeToGameStarted(): void {
        this.startGameSubscription?.unsubscribe();
        this.startGameSubscription = this.facade.onGameStarted().subscribe({
            next: (startedGameId) => {
                if (!this.facade.shouldStartGame(startedGameId)) {
                    return;
                }
                this.gameStarted = true;
                this.router.navigate(['/play', startedGameId]);
            },
        });
    }

    private subscribeToGameEnded(): void {
        this.gameEndedSubscription?.unsubscribe();
        this.gameEndedSubscription = this.facade.onGameEnded().subscribe({
            next: () => {
                this.facade.clearAndRedirectAfterGameEnded();
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

        const localPlayerName = this.facade.getLocalPlayerName(this.localPlayer);
        const activeGameId = this.activeGameService.activeGame?._id;

        if (!localPlayerName || !activeGameId) {
            return;
        }

        this.facade.kickOtherPlayersIfOrganizer(localPlayerName);
        this.hasLeftWaitingRoom = true;
        this.facade.leaveWaitingRoomAndCleanup(localPlayerName);
    }

    private initializeActiveGameData(): void {
        if (!this.activeGameService.activeGame || !this.activeGameService.activeGame.game) {
            return;
        }

        this.facade.initializeGridFromActiveGame();

        this.localPlayer = this.facade.getLocalPlayer();

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
