import { Component, inject } from '@angular/core';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';

@Component({
    selector: 'app-game-action',
    imports: [],
    templateUrl: './game-action.component.html',
})
export class GameActionComponent {
    protected readonly activeGameService: ActiveGameService = inject(ActiveGameService);
    protected readonly gameTurnService: GameTurnService = inject(GameTurnService);
    protected readonly localPlayerService: LocalPlayerService = inject(LocalPlayerService);

    toggle() {
        if (!this.gameTurnService.canEndTurn || this.hasUsedActionThisTurn()) return;
        this.activeGameService.toggleActionMode();
    }
    hasUsedActionThisTurn(): boolean {
        const localPlayer = this.localPlayerService.getLocalPlayer();
        if (!localPlayer) return false;
        const player = this.activeGameService.getPlayerByName(localPlayer.name);
        return (player?.actionsLeft ?? 0) === 0;
    }
}
