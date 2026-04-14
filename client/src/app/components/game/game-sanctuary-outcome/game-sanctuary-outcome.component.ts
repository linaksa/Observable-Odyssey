import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { GAME_SANCTUARY_OUTCOME_HOST_BINDINGS } from '@app/constants/component-host-bindings';
import { GAME_SANCTUARY_OUTCOME_AUTO_CLOSE_MS } from '@app/constants/gameplay';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { ISanctuaryInteractedResult } from '@common/socket-payloads';

@Component({
    selector: 'app-game-sanctuary-outcome',
    templateUrl: './game-sanctuary-outcome.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: GAME_SANCTUARY_OUTCOME_HOST_BINDINGS,
})
export class GameSanctuaryOutcomeComponent {
    private readonly activeGameService = inject(ActiveGameService);
    private readonly localPlayerService = inject(LocalPlayerService);

    protected readonly localPlayerName = computed<string | null>(() => this.localPlayerService.getLocalPlayer()?.name ?? null);
    protected readonly visibleOutcome = computed<ISanctuaryInteractedResult | null>(() => {
        const outcome = this.activeGameService.sanctuaryOutcome();
        const playerName = this.localPlayerName();

        if (!outcome || !playerName || outcome.playerId !== playerName) {
            return null;
        }

        return outcome;
    });

    constructor() {
        effect((onCleanup) => {
            const outcome = this.visibleOutcome();
            if (!outcome) {
                return;
            }

            const timeoutId = setTimeout(() => this.closeOutcome(), GAME_SANCTUARY_OUTCOME_AUTO_CLOSE_MS);
            onCleanup(() => clearTimeout(timeoutId));
        });
    }

    protected closeOutcome(): void {
        this.activeGameService.sanctuaryOutcome.set(null);
    }

    protected isSuccess(outcome: ISanctuaryInteractedResult): boolean {
        return outcome.succeeded;
    }
}
