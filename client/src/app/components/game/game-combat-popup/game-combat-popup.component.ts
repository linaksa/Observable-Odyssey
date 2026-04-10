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
    GAME_COMBAT_TURN_RESULT_PLACEHOLDER_STATS,
} from '@app/constants/gameplay';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
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
    styles: [
        `
            .combat-panel {
                container-type: inline-size;
                container-name: combat-popup;
            }

            .combat-comparison,
            .combat-actions {
                display: grid;
                gap: 0.75rem;
            }

            .combat-comparison {
                grid-template-columns: 1fr;
            }

            .combat-actions {
                grid-template-columns: 1fr;
            }

            .combat-card {
                min-width: 0;
            }

            .combat-vs {
                justify-self: center;
            }

            @container combat-popup (min-width: 24rem) {
                .combat-actions {
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                }
            }

            @container combat-popup (min-width: 28rem) {
                .combat-comparison {
                    grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
                    align-items: center;
                }
            }
        `,
    ],
})
export class GameCombatPopupComponent {
    private readonly activeGameService = inject(ActiveGameService);
    private readonly gameTurnService = inject(GameTurnService);

    protected readonly attackPosture = AttackPosture;
    protected readonly roundOutcome = this.activeGameService.roundOutcome;
    protected readonly combatTurnResultPlaceholderStats = GAME_COMBAT_TURN_RESULT_PLACEHOLDER_STATS;
    private readonly selectedModeState = signal<AttackPosture | null>(null);
    private readonly confirmedState = signal(false);
    private readonly dialogMessageState = signal(GAME_COMBAT_DEFAULT_DIALOG_MESSAGE);

    private lastTurnCount: number | null = null;
    private lastCombatTimeLeft = 0;

    protected readonly combatActive = computed<boolean>(() => this.gameTurnService.isCombatActive());
    protected readonly actionsLocked = computed<boolean>(() => this.confirmedState() || !!this.roundOutcome());
    protected readonly combatTimeLeftDisplaySeconds = computed(() => this.gameTurnService.combatTimeLeftSeconds() ?? 0);
    protected readonly currentAttack = computed(() => {
        this.combatActive();
        this.combatTimeLeftSeconds();
        return this.activeGameService.activeGame?.currentAttack ?? null;
    });
    protected readonly combatTimeLeftSeconds = this.gameTurnService.combatTimeLeftSeconds;
    protected get selectedMode(): AttackPosture | null {
        return this.selectedModeState();
    }

    protected get dialogMessage(): string {
        return this.dialogMessageState();
    }

    protected get attackerCharacter(): ICharacter | undefined {
        const attackerName = this.currentAttack()?.attacker;
        return attackerName ? this.activeGameService.getPlayerByName(attackerName) : undefined;
    }

    protected get defenderCharacter(): ICharacter | undefined {
        const defenderName = this.currentAttack()?.defender;
        return defenderName ? this.activeGameService.getPlayerByName(defenderName) : undefined;
    }

    constructor() {
        effect(() => {
            const attack = this.currentAttack();
            const combatActive = this.combatActive();
            const combatTimeLeft = this.combatTimeLeftSeconds();

            if (!attack || !combatActive) {
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
        if (this.confirmedState()) {
            return;
        }

        this.selectedModeState.set(mode);
        const nextMessage = mode === AttackPosture.Defensive ? GAME_COMBAT_DEFENSIVE_SELECTED_MESSAGE : GAME_COMBAT_OFFENSIVE_SELECTED_MESSAGE;
        this.dialogMessageState.set(nextMessage);
    }

    protected confirmAction(): void {
        const selectedMode = this.selectedModeState();

        if (selectedMode === null || this.confirmedState()) {
            return;
        }

        this.confirmedState.set(true);
        this.activeGameService.chooseAttackMode(selectedMode);
        this.dialogMessageState.set(
            selectedMode === AttackPosture.Defensive ? GAME_COMBAT_DEFENSIVE_CONFIRMED_MESSAGE : GAME_COMBAT_OFFENSIVE_CONFIRMED_MESSAGE,
        );
    }

    protected getAvatarUrl(player: ICharacter | undefined): string {
        return player ? buildAvatarAssetPath(player.avatar, true) : '';
    }

    protected getHealthRange(player: ICharacter | undefined): unknown[] {
        if (!player) {
            return [];
        }

        return Array.from({ length: player.initialHealth });
    }

    protected getFilledBlocks(player: ICharacter | undefined): number {
        if (!player || player.initialHealth <= 0) {
            return 0;
        }

        return Math.min(player.currentHealth, player.initialHealth);
    }

    private resetSelection(): void {
        this.selectedModeState.set(null);
        this.confirmedState.set(false);
        this.dialogMessageState.set(GAME_COMBAT_DEFAULT_DIALOG_MESSAGE);
    }
}
