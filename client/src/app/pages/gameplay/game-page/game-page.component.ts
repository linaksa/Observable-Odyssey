import { Component, HostListener, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { JournalComponent } from '@app/components/chat/journal/journal.component';
import { CombatModeComponent } from '@app/components/game/combat-mode/combat-mode.component';
import { CombatOutcomeComponent } from '@app/components/game/combat-outcome/combat-outcome.component';
import { GameActionComponent } from '@app/components/game/game-action/game-action.component';
import { GameEndedComponent } from '@app/components/game/game-ended/game-ended.component';
import { GameInfosComponent } from '@app/components/game/game-infos/game-infos.component';
import { GameComponent } from '@app/components/game/game/game.component';
import { PlayerInfoComponent } from '@app/components/game/player-info/player-info.component';
import { PlayerListComponent } from '@app/components/game/player-list/player-list.component';
import { TurnStatusComponent } from '@app/components/game/turn-status/turn-status.component';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { GamePageFacadeService } from '@app/services/gameplay/game-page.facade.service';
import { isTypingInChatMessageInput } from '@app/utils/keyboard-shortcuts.utils';
import { ICharacter } from '@common/character';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-page',
    imports: [
        PlayerInfoComponent,
        GameComponent,
        PlayerListComponent,
        GameInfosComponent,
        GameActionComponent,
        JournalComponent,
        GameEndedComponent,
        TurnStatusComponent,
        CombatModeComponent,
        CombatOutcomeComponent,
    ],
    providers: [GameTurnService, GamePageFacadeService],
    templateUrl: './game-page.component.html',
})
export class GamePageComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly facade = inject(GamePageFacadeService);
    protected readonly activeGameService = this.facade.activeGameService;
    private routeSubscription?: Subscription;
    private playersSubscription?: Subscription;

    ngOnInit(): void {
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

    ngOnDestroy(): void {
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
