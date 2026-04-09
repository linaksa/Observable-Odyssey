import { Component, HostListener, inject, OnDestroy, OnInit, signal, WritableSignal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoadingOverlayComponent } from '@app/components/common/loading-overlay/loading-overlay.component';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { GameChatPanelComponent } from '@app/components/game/game-chat-panel/game-chat-panel.component';
import { GameGridPanelComponent } from '@app/components/game/game-grid-panel/game-grid-panel.component';
import { GameListPanelComponent } from '@app/components/game/game-list-panel/game-list-panel.component';
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
        GameListPanelComponent,
        GameGridPanelComponent,
        GameChatPanelComponent,
        LoadingOverlayComponent,
    ],
    providers: [GameTurnService, GamePageFacadeService],
    templateUrl: './game-page.component.html',
})
export class GamePageComponent implements OnInit, OnDestroy {
    // TODO: write the new game-page with component from @client/src/app/components/game/

    protected readonly showButton: WritableSignal<boolean> = signal(false);
    protected readonly isLoading: WritableSignal<boolean> = signal(false);

    private readonly timeout: number = 3000;
    private buttonTimeoutId?: ReturnType<typeof setTimeout>;

    ngOnInit(): void {
        this.isLoading.set(true);

        this.initializeButtonTimeout();
        // loading the data for the page

        this.isLoading.set(false);
    }

    ngOnDestroy(): void {
        // unsubscribe

        if (this.buttonTimeoutId) {
            clearTimeout(this.buttonTimeoutId);
        }
    }

    private initializeButtonTimeout(): void {
        this.buttonTimeoutId = setTimeout(() => {
            this.showButton.set(true);
        }, this.timeout);
    }

    // the following is for reference only, this is the old implementation
    // for the old implementation of the front-end, go to the @client/src/app/components/game.old/ folder
    private readonly route = inject(ActivatedRoute);
    private readonly facade = inject(GamePageFacadeService);
    protected readonly activeGameService = this.facade.activeGameService;
    private routeSubscription?: Subscription;
    private playersSubscription?: Subscription;

    old_ngOnInit(): void {
        this.facade.connectDebugSocket();
        this.routeSubscription = this.route.params.subscribe((params) => {
            const activeGameId = this.facade.resolveActiveGameId(params.activeGameId);
            if (!activeGameId) {
                return;
            }

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

    @HostListener('window:keydown', ['$event'])
    handleKeyDown(event: KeyboardEvent) {
        if (isTypingInChatMessageInput(event)) return;
        if (event.key.toLowerCase() === 'm') {
            this.facade.emitDebugToggle();
        }
    }

    old_ngOnDestroy(): void {
        this.routeSubscription?.unsubscribe();
        this.playersSubscription?.unsubscribe();
        this.facade.destroyTurnService();
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
}
