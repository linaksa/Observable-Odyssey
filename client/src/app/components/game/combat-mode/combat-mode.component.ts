import { Component, inject } from '@angular/core';
import { ActiveGameService } from '@app/services/active-game.service';
import { ICharacter } from '@common/character';
import { Avatar } from '@common/constants';

@Component({
  selector: 'app-combat-mode',
  imports: [],
  templateUrl: './combat-mode.component.html',
})
export class CombatModeComponent {
    activeGameService: ActiveGameService = inject(ActiveGameService);

    getHealthRange (player: ICharacter) {
        return new Array(player.initialHealth);
    }

    getFilledBlocks(player: ICharacter) {
        return Math.floor((player.currentHealth / player.initialHealth) * player.initialHealth);
    }

    getAvatarUrl(avatar: Avatar): string {
        return `assets/form-page/${avatar}.png`;
    }
}
