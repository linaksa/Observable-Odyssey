import { Component, inject } from '@angular/core';
import { ActiveGameService } from '@app/services/active-game.service';
import { GameTurnService } from '@app/services/game-turn.service';

@Component({
    selector: 'app-game-attack',
    imports: [],
    templateUrl: './game-attack.component.html',
})
export class GameAttackComponent {
    protected readonly activeGameService: ActiveGameService = inject(ActiveGameService);
    protected readonly gameTurnService: GameTurnService = inject(GameTurnService);

    toggle() {
        if (!this.gameTurnService.canEndTurn) return;
        this.activeGameService.toggleAttackMode();
    }
}
