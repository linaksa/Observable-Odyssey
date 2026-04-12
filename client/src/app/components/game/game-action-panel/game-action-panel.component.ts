import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GAME_ACTION_PANEL_HOST_BINDINGS } from '@app/constants/component-host-bindings';
import { GameActionControlsComponent } from '@app/components/game/game-action-controls/game-action-controls.component';
import { GamePlayerCardComponent } from '@app/components/game/game-player-card/game-player-card.component';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { ICharacter } from '@common/character';

@Component({
    selector: 'app-game-action-panel',
    imports: [GamePlayerCardComponent, GameActionControlsComponent],
    templateUrl: './game-action-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: GAME_ACTION_PANEL_HOST_BINDINGS,
})
export class GameActionPanelComponent {
    private readonly activeGameService = inject(ActiveGameService);
    private readonly gameTurnService = inject(GameTurnService);
    private readonly localPlayerService = inject(LocalPlayerService);

    protected readonly actionMode = this.activeGameService.actionMode;
    protected readonly debugMode = this.activeGameService.isDebugMode;
    protected readonly turnTimeLeftSeconds = this.gameTurnService.turnTimeLeftSeconds;
    protected readonly localPlayer = computed<ICharacter | undefined>(() => {
        this.activeGameService.actionStatsVersion();
        this.activeGameService.hasChangedLocation();
        this.activeGameService.hasAbandoned();
        this.activeGameService.gameHasEnded();

        const localPlayerName = this.localPlayerService.getLocalPlayer()?.name;
        if (!localPlayerName) {
            return undefined;
        }

        const player = this.activeGameService.activeGame?.players.find((currentPlayer) => currentPlayer.name === localPlayerName);
        return player ? { ...player } : undefined;
    });
    protected readonly currentTurnPlayerName = computed<string | null>(() => {
        this.activeGameService.actionStatsVersion();
        this.activeGameService.hasChangedLocation();
        this.activeGameService.hasAbandoned();
        this.activeGameService.gameHasEnded();
        return this.gameTurnService.currentPlayerName;
    });

    protected get isTurnPreparing(): boolean {
        return this.gameTurnService.isTurnPreparing();
    }

    protected get isInCombat(): boolean {
        return this.gameTurnService.isCombatActive() || !!this.activeGameService.activeGame?.currentAttack;
    }

    protected get isGameFinished(): boolean {
        return !!this.activeGameService.activeGame?.isFinished;
    }

    protected get isLocalPlayerTurn(): boolean {
        const localPlayerName = this.localPlayerService.getLocalPlayer()?.name;
        const currentPlayerName = this.currentTurnPlayerName();
        return !!localPlayerName && localPlayerName === currentPlayerName;
    }

    protected readonly localPlayerHasActionLeft = computed<boolean>(() => (this.localPlayer()?.actionsLeft ?? 0) > 0);

    protected get canEndTurn(): boolean {
        return this.gameTurnService.canEndTurn && !this.isInCombat && !this.isGameFinished;
    }

    protected get canToggleActionMode(): boolean {
        return this.isLocalPlayerTurn && this.canEndTurn && this.localPlayerHasActionLeft();
    }

    protected get combatStatus(): string {
        const currentAttack = this.activeGameService.activeGame?.currentAttack;
        const localPlayerName = this.localPlayerService.getLocalPlayer()?.name;

        if (!currentAttack) {
            return '';
        }

        if (localPlayerName === currentAttack.attacker || localPlayerName === currentAttack.defender) {
            return `Combat en cours : ${currentAttack.attacker} vs ${currentAttack.defender}`;
        }
        return `Combat en cours entre ${currentAttack.attacker} et ${currentAttack.defender}`;
    }

    protected toggleActionMode(): void {
        if (!this.canToggleActionMode) {
            return;
        }
        this.activeGameService.toggleActionMode();
    }

    protected endTurn(): void {
        if (!this.canEndTurn) {
            return;
        }
        this.gameTurnService.endTurn();
    }

    protected get showTurnTimer(): boolean {
        return this.turnTimeLeftSeconds() !== null && this.turnTimeLeftSeconds() !== undefined;
    }
}
