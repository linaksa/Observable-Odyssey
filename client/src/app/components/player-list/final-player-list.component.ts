import { Component, Input } from '@angular/core';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';
import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';

@Component({
    selector: 'app-final-player-list',
    imports: [],
    templateUrl: './final-player-list.component.html',
})
export class FinalPlayerListComponent {
    @Input() activeGame: IActiveGame;

    getAvatarUrl(character: ICharacter): string {
        if (!character) return '';
        return buildAvatarAssetPath(character.avatar, true);
    }

    getPlayerVisitedTilesRatio(player: ICharacter): number {
        const totalTiles = Math.pow(this.activeGame.game.board.cells.length, 2);
        return (player.visitedCells.length / totalTiles) * 100;
    }
}
