import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GAME_ACTION_PANEL_HOST_BINDINGS } from '@app/constants/component-host-bindings';
import { DICE_ICON_MAPPING } from '@app/constants/player-info';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';
import { formatPlayerStatValue } from '@app/utils/player-stat.utils';
import { ICharacter } from '@common/character';

@Component({
    selector: 'app-game-action-panel',
    imports: [NgOptimizedImage],
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
    protected readonly playerStatValue = formatPlayerStatValue;
    protected readonly currentTurnPlayerName = computed<string | null>(() => {
        this.activeGameService.hasChangedLocation();
        this.activeGameService.hasAbandonned();
        this.activeGameService.gameHasEnded();
        return this.gameTurnService.currentPlayerName;
    });

    protected get localPlayer(): ICharacter | undefined {
        const localPlayerName = this.localPlayerService.getLocalPlayer()?.name;
        if (!localPlayerName) {
            return undefined;
        }

        return this.activeGameService.activeGame?.players.find((player) => player.name === localPlayerName);
    }

    protected get avatarUrl(): string {
        const player = this.localPlayer;
        return player ? buildAvatarAssetPath(player.avatar, true) : '';
    }

    protected get attackDiceIconUrl(): string {
        const player = this.localPlayer;
        return player ? DICE_ICON_MAPPING[player.attackBonusDiceType] : '';
    }

    protected get defenseDiceIconUrl(): string {
        const player = this.localPlayer;
        return player ? DICE_ICON_MAPPING[player.defenseBonusDiceType] : '';
    }

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

    protected get localPlayerHasActionLeft(): boolean {
        return (this.localPlayer?.actionsLeft ?? 0) > 0;
    }

    protected get canEndTurn(): boolean {
        return this.gameTurnService.canEndTurn && !this.isInCombat && !this.isGameFinished;
    }

    protected get canToggleActionMode(): boolean {
        return this.isLocalPlayerTurn && this.canEndTurn && this.localPlayerHasActionLeft;
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
