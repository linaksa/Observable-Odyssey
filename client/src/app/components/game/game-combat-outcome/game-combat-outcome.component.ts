import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy } from '@angular/core';
import { GAME_COMBAT_OUTCOME_HOST_BINDINGS } from '@app/constants/component-host-bindings';
import { GAME_COMBAT_OUTCOME_AUTO_CLOSE_MS } from '@app/constants/gameplay';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { CombatOutcome } from '@common/attack-result';

@Component({
    selector: 'app-game-combat-outcome',
    templateUrl: './game-combat-outcome.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: GAME_COMBAT_OUTCOME_HOST_BINDINGS,
})
export class GameCombatOutcomeComponent implements OnDestroy {
    private readonly activeGameService = inject(ActiveGameService);
    private readonly localPlayerService = inject(LocalPlayerService);

    protected readonly debugMode = this.activeGameService.isDebugMode;
    protected readonly localPlayerName = computed<string | null>(() => this.localPlayerService.getLocalPlayer()?.name ?? null);
    protected readonly visibleOutcome = computed<CombatOutcome | null>(() => {
        const outcome = this.activeGameService.combatOutcome();
        const playerName = this.localPlayerName();

        if (!outcome || !playerName) {
            return null;
        }

        return outcome.winner === playerName || outcome.losers.includes(playerName) ? outcome : null;
    });

    constructor() {
        effect((onCleanup) => {
            const outcome = this.visibleOutcome();
            if (!outcome) {
                return;
            }

            const timeoutId = setTimeout(() => this.closeOutcome(), GAME_COMBAT_OUTCOME_AUTO_CLOSE_MS);
            onCleanup(() => clearTimeout(timeoutId));
        });
    }

    protected closeOutcome(): void {
        this.activeGameService.combatOutcome.set(null);
    }

    protected isWinner(outcome: CombatOutcome): boolean {
        return this.localPlayerName() === outcome.winner;
    }

    protected isLoser(outcome: CombatOutcome): boolean {
        const playerName = this.localPlayerName();
        return playerName !== null && outcome.losers.includes(playerName);
    }

    ngOnDestroy(): void {
        this.activeGameService.combatOutcome.set(null);
    }

}
