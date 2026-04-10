import { ChangeDetectionStrategy, Component, computed, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingOverlayComponent } from '@app/components/common/loading-overlay/loading-overlay.component';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { GAME_PAGE_HOST_BINDINGS } from '@app/constants/component-host-bindings';
import { GAME_PAGE_RETURN_BUTTON_DELAY_MS } from '@app/constants/gameplay';
import { GameActionPanelComponent } from '@app/components/game/game-action-panel/game-action-panel.component';
import { GameEndedComponent } from '@app/components/game/game-ended/game-ended.component';
import { GameGridPanelComponent } from '@app/components/game/game-grid-panel/game-grid-panel.component';
import { GameInfoPanelComponent } from '@app/components/game/game-info-panel/game-info-panel.component';
import { GamePageFacadeService } from '@app/services/gameplay/game-page.facade.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { isTypingInChatMessageInput } from '@app/utils/keyboard-shortcuts.utils';
import { ICharacter } from '@common/character';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-page',
    imports: [
        NavButtonsComponent,
        PageTitleComponent,
        GameActionPanelComponent,
        GameGridPanelComponent,
        GameInfoPanelComponent,
        GameEndedComponent,
        LoadingOverlayComponent,
    ],
    providers: [GameTurnService, GamePageFacadeService],
    templateUrl: './game-page.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: GAME_PAGE_HOST_BINDINGS,
})
export class GamePageComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly facade = inject(GamePageFacadeService);

    protected readonly activeGameService = this.facade.activeGameService;
    protected readonly showButton: WritableSignal<boolean> = signal(false);
    protected readonly isLoading = computed(
        () => !this.hasAttemptedJoin() || this.activeGameService.isLoading() || !this.activeGameService.activeGame,
    );

    private readonly hasAttemptedJoin = signal(false);
    private activeGameId?: string;
    private hasExitedGame = false;
    private buttonTimeoutId?: ReturnType<typeof setTimeout>;
    private routeSubscription?: Subscription;
    private playersSubscription?: Subscription;

    ngOnInit(): void {
        this.facade.closeAllPopups();
        this.initializeButtonTimeout();
        this.facade.connectDebugSocket();

        this.routeSubscription = this.route.params.subscribe((params) => {
            const activeGameId = this.facade.resolveActiveGameId(params.activeGameId);
            if (!activeGameId) {
                return;
            }

            this.activeGameId = activeGameId;
            this.hasAttemptedJoin.set(true);
            this.facade.setActiveGame(activeGameId);

            if (!this.playersSubscription) {
                this.facade.connectGameplaySocket();
                this.playersSubscription = this.facade.onPlayersUpdated().subscribe({
                    next: (players) => {
                        this.facade.applyPlayersUpdate(players);
                    },
                });

                this.facade.initializeTurnListeners();
            }

            this.facade.emitJoinGame(activeGameId);
        });
    }

    ngOnDestroy(): void {
        this.handlePageExit();
        this.routeSubscription?.unsubscribe();
        this.playersSubscription?.unsubscribe();
        this.facade.destroyTurnService();

        if (this.buttonTimeoutId) {
            clearTimeout(this.buttonTimeoutId);
        }
    }

    handleKeyDown(event: KeyboardEvent): void {
        if (isTypingInChatMessageInput(event)) return;
        if (event.key.toLowerCase() === 'm') {
            this.facade.emitDebugToggle();
        }
    }

    private initializeButtonTimeout(): void {
        this.buttonTimeoutId = setTimeout(() => {
            this.showButton.set(true);
        }, GAME_PAGE_RETURN_BUTTON_DELAY_MS);
    }

    get currentAttack() {
        return this.facade.currentAttack;
    }

    get currentPlayerName() {
        return this.facade.currentPlayerName;
    }

    get turnTimeLeftSeconds() {
        return this.facade.turnTimeLeftSeconds;
    }

    get isTurnPreparing() {
        return this.facade.isTurnPreparing;
    }

    get canEndTurn() {
        return this.facade.canEndTurn;
    }

    get isGameFinished() {
        return this.facade.isGameFinished;
    }

    get turnStatusData() {
        return this.facade.turnStatusData;
    }

    get pendingFlagQuestion() {
        return this.facade.pendingFlagQuestion;
    }

    get localPlayer(): ICharacter | undefined {
        return this.facade.getLocalPlayer();
    }

    endTurn(): void {
        this.facade.endTurn();
    }

    respondToFlagRequest(accepted: boolean): void {
        this.facade.respondToFlagRequest(accepted);
    }

    abandonGame(): void {
        this.handlePageExit();
        void this.router.navigate(['/home']);
    }

    handlePageExit(): void {
        if (this.hasExitedGame || !this.hasAttemptedJoin() || this.isGameFinished) {
            return;
        }

        const localPlayer = this.localPlayer;
        const activeGameId = this.activeGameId ?? this.activeGameService.activeGame?._id;

        if (!localPlayer || !activeGameId) {
            return;
        }

        this.hasExitedGame = true;
        this.facade.abandonGame();
    }
}
