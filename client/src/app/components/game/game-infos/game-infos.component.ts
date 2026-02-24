import { Component, inject } from '@angular/core';
import { ActiveGameService } from '@app/services/active-game.service';

@Component({
    selector: 'app-game-infos',
    imports: [],
    templateUrl: './game-infos.component.html',
})
export class GameInfosComponent {
    activeGameService = inject(ActiveGameService);

    get boardSize(): string {
        const size = this.activeGameService.activeGame.game.board.cells.length;
        return `${size}x${size}`;
    }
}
