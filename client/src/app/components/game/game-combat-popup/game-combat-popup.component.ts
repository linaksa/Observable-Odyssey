import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { GameCombatTurnResultComponent } from '@app/components/game/game-combat-turn-result/game-combat-turn-result.component';
import { GAME_COMBAT_POPUP_HOST_BINDINGS } from '@app/constants/component-host-bindings';
import {
    COMBAT_DURATION_SECONDS,
    GAME_COMBAT_DEFAULT_DIALOG_MESSAGE,
    GAME_COMBAT_DEFENSIVE_CONFIRMED_MESSAGE,
    GAME_COMBAT_DEFENSIVE_SELECTED_MESSAGE,
    GAME_COMBAT_OFFENSIVE_CONFIRMED_MESSAGE,
    GAME_COMBAT_OFFENSIVE_SELECTED_MESSAGE,
} from '@app/constants/gameplay';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';
import { AttackPosture } from '@common/attackResult';
import { ICharacter } from '@common/character';
import { HUNDRED_PERCENT } from '@common/constants';

@Component({
    selector: 'app-game-combat-popup',
    imports: [CommonModule, GameCombatTurnResultComponent],
    templateUrl: './game-combat-popup.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: GAME_COMBAT_POPUP_HOST_BINDINGS,
})
export class GameCombatPopupComponent {
    private readonly activeGameService = inject(ActiveGameService);
    private readonly gameTurnService = inject(GameTurnService);
    private readonly localPlayerService = inject(LocalPlayerService);

    protected readonly attackPosture = AttackPosture;
    protected readonly selectedMode = signal<AttackPosture | null>(null);
    protected readonly confirmed = signal(false);
    protected readonly dialogMessage = signal(GAME_COMBAT_DEFAULT_DIALOG_MESSAGE);
    protected readonly roundOutcome = this.activeGameService.roundOutcome;

    private lastTurnCount: number | null = null;
    private lastCombatTimeLeft = 0;

    protected readonly combatActive = computed<boolean>(() => this.gameTurnService.isCombatActive());
    protected readonly currentAttack = computed(() => {
        this.combatActive();
        this.combatTimeLeftSeconds();
        return this.activeGameService.activeGame?.currentAttack ?? null;
    });
    protected readonly combatTimeLeftSeconds = this.gameTurnService.combatTimeLeftSeconds;
    protected readonly attacker = computed<ICharacter | null>(() => {
        const attackerName = this.currentAttack()?.attacker;
        return attackerName ? (this.activeGameService.getPlayerByName(attackerName) ?? null) : null;
    });
    protected readonly defender = computed<ICharacter | null>(() => {
        const defenderName = this.currentAttack()?.defender;
        return defenderName ? (this.activeGameService.getPlayerByName(defenderName) ?? null) : null;
    });
    protected readonly isLocalParticipant = computed<boolean>(() => {
        const attack = this.currentAttack();
        const localPlayerName = this.localPlayerService.getLocalPlayer()?.name;

        if (!attack || !localPlayerName) {
            return false;
        }

        return attack.attacker === localPlayerName || attack.defender === localPlayerName;
    });
    protected readonly showTurnResults = computed<boolean>(() => {
        this.combatActive();
        this.combatTimeLeftSeconds();
        return this.isLocalParticipant() && Boolean(this.roundOutcome());
    });

    constructor() {
        effect(() => {
            const attack = this.currentAttack();
            const combatTimeLeft = this.combatTimeLeftSeconds();

            if (!attack || !this.combatActive()) {
                this.resetSelection();
                this.lastTurnCount = null;
                this.lastCombatTimeLeft = 0;
                return;
            }

            if (this.lastTurnCount !== null && attack.turnCount !== this.lastTurnCount) {
                this.resetSelection();
            } else if (combatTimeLeft !== null && this.lastCombatTimeLeft !== 0 && combatTimeLeft > this.lastCombatTimeLeft) {
                this.resetSelection();
            }

            this.lastTurnCount = attack.turnCount;
            if (combatTimeLeft !== null) {
                this.lastCombatTimeLeft = combatTimeLeft;
            }
        });
    }

    protected get combatTimerPercent(): number {
        const timeLeft = this.combatTimeLeftSeconds();
        if (timeLeft === null) {
            return 0;
        }

        return Math.max(0, (timeLeft / COMBAT_DURATION_SECONDS) * HUNDRED_PERCENT);
    }

    protected selectAction(mode: AttackPosture): void {
        if (!this.isLocalParticipant() || this.confirmed() || this.roundOutcome()) {
            return;
        }

        this.selectedMode.set(mode);
        this.dialogMessage.set(mode === AttackPosture.Defensive ? GAME_COMBAT_DEFENSIVE_SELECTED_MESSAGE : GAME_COMBAT_OFFENSIVE_SELECTED_MESSAGE);
    }

    protected confirmAction(): void {
        const selectedMode = this.selectedMode();

        if (!this.isLocalParticipant() || selectedMode === null || this.confirmed() || this.roundOutcome()) {
            return;
        }

        this.confirmed.set(true);
        this.activeGameService.chooseAttackMode(selectedMode);
        this.dialogMessage.set(
            selectedMode === AttackPosture.Defensive ? GAME_COMBAT_DEFENSIVE_CONFIRMED_MESSAGE : GAME_COMBAT_OFFENSIVE_CONFIRMED_MESSAGE,
        );
    }

    protected avatarUrl(player: ICharacter | null): string {
        return player ? buildAvatarAssetPath(player.avatar, true) : '';
    }

    protected healthBlocks(player: ICharacter | null): unknown[] {
        if (!player) {
            return [];
        }

        return Array.from({ length: player.initialHealth });
    }

    protected filledHealthBlocks(player: ICharacter | null): number {
        if (!player || player.initialHealth <= 0) {
            return 0;
        }

        return Math.min(player.currentHealth, player.initialHealth);
    }

    private resetSelection(): void {
        this.selectedMode.set(null);
        this.confirmed.set(false);
        this.dialogMessage.set(GAME_COMBAT_DEFAULT_DIALOG_MESSAGE);
    }
}
