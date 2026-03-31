import { Component, inject, OnInit } from '@angular/core';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';

const THREE_SECOND_TIMEOUT = 3000;

@Component({
    selector: 'app-combat-outcome',
    imports: [],
    templateUrl: './combat-outcome.component.html',
})
export class CombatOutcomeComponent implements OnInit {
    private readonly activeGameService: ActiveGameService = inject(ActiveGameService);
    protected readonly localPlayerService: LocalPlayerService = inject(LocalPlayerService);

    private outcomeTimeout: ReturnType<typeof setTimeout> | null = null;

    ngOnInit() {
        const outcome = this.activeGameService.combatOutcome();
        const playerName = this.localPlayerService.getLocalPlayer()?.name;

        if (!outcome || !playerName) return;

        if (outcome.winner === playerName || outcome.losers.includes(playerName)) {
            this.outcomeTimeout = setTimeout(() => {
                this.closeOutcome();
            }, THREE_SECOND_TIMEOUT);
        }
    }

    getCombatOutcome() {
        return this.activeGameService.combatOutcome();
    }

    resetCombatOutcome() {
        this.activeGameService.combatOutcome.set(null);
    }

    closeOutcome() {
        if (this.outcomeTimeout !== null) {
            clearTimeout(this.outcomeTimeout);
            this.outcomeTimeout = null;
        }

        this.resetCombatOutcome();
    }
}
