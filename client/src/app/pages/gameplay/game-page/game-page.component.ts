import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingOverlayComponent } from '@app/components/common/loading-overlay/loading-overlay.component';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { GameActionPanelComponent } from '@app/components/game/game-action-panel/game-action-panel.component';
import { GameCombatOutcomeComponent } from '@app/components/game/game-combat-outcome/game-combat-outcome.component';
import { GameEndedComponent } from '@app/components/game/game-ended/game-ended.component';
import { GameGridPanelComponent } from '@app/components/game/game-grid-panel/game-grid-panel.component';
import { GameInfoPanelComponent } from '@app/components/game/game-info-panel/game-info-panel.component';
import { GAME_PAGE_HOST_BINDINGS } from '@app/constants/component-host-bindings';
import { GAME_PAGE_RETURN_BUTTON_DELAY_MS } from '@app/constants/gameplay';
import { GamePageFacadeService } from '@app/services/gameplay/game-page.facade.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { isTypingInChatMessageInput } from '@app/utils/keyboard-shortcuts.utils';
import { CombatOutcome } from '@common/attack-result';
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
        GameCombatOutcomeComponent,
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
    private readonly destroyRef = inject(DestroyRef);

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

    protected readonly visibleOutcome = computed<CombatOutcome | null>(() => {
        const outcome = this.activeGameService.combatOutcome();
        const player = this.facade.getLocalPlayer();

        if (!outcome || !player) {
            return null;
        }

        return outcome.winner === player.name || outcome.losers.includes(player.name) ? outcome : null;
    });

    ngOnInit(): void {
        this.facade.closeAllPopups();
        this.initializeButtonTimeout();
        this.facade.connectDebugSocket();
        this.facade.connectGameLogs();

        this.routeSubscription = this.route.params.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const activeGameId = this.facade.resolveActiveGameId(params.activeGameId);
            if (!activeGameId) {
                return;
            }

            if (this.activeGameId !== activeGameId) {
                this.facade.clearGameLogs();
            }

            this.activeGameId = activeGameId;
            this.hasAttemptedJoin.set(true);
            this.facade.setActiveGame(activeGameId);

            if (!this.playersSubscription) {
                this.facade.connectGameplaySocket();
                this.playersSubscription = this.facade
                    .onPlayersUpdated()
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
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
        this.facade.disconnectDebugSocket();
        this.facade.disconnectGameLogs();
        this.facade.destroyTurnService();

        if (this.buttonTimeoutId) {
            clearTimeout(this.buttonTimeoutId);
            this.buttonTimeoutId = undefined;
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
