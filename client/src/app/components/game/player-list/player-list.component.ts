import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActiveGameService } from '@app/services/active-game.service';
import { ICharacter } from '@common/character';
import { Avatar } from '@common/constants';

@Component({
    selector: 'app-player-list',
    imports: [CommonModule],
    templateUrl: './player-list.component.html',
})
export class PlayerListComponent {
    protected readonly activeGameService = inject(ActiveGameService);

    buildPlayerAvatarUrl(avatar: Avatar): string {
        return `assets/form-page/${avatar}.png`;
    }

    get currentPlayer(): ICharacter {
        return this.activeGameService.activeGame.players[this.activeGameService.activeGame.currentPlayerIndex];
    }
}
