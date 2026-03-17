import { Component, inject } from '@angular/core';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';

@Component({
    selector: 'app-game-attack',
    imports: [],
    templateUrl: './game-attack.component.html',
})
export class GameAttackComponent {
    protected readonly activeGameService: ActiveGameService = inject(ActiveGameService);
    protected readonly gameTurnService: GameTurnService = inject(GameTurnService);
    protected readonly localPlayerService: LocalPlayerService = inject(LocalPlayerService);

    toggle() {
        if (!this.gameTurnService.canEndTurn || this.hasAttackedThisTurn()) return;
        this.activeGameService.toggleAttackMode();
    }
    hasAttackedThisTurn(): boolean {
        const localPlayer = this.localPlayerService.getLocalPlayer();
        if (!localPlayer) return false;
        const player = this.activeGameService.getPlayerByName(localPlayer.name);
        return (player?.actionsLeft ?? 0) === 0;
    }
}
