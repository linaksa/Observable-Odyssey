import { Component, inject } from '@angular/core';
import { DICE_ICON_MAPPING } from '@app/constants/player-info';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';
import { ICharacter } from '@common/character';

@Component({
    selector: 'app-player-info',
    imports: [],
    templateUrl: './player-info.component.html',
})
export class PlayerInfoComponent {
    private readonly activeGameService = inject(ActiveGameService);
    private localPlayerService = inject(LocalPlayerService);

    get player(): ICharacter | undefined {
        const localPlayer = this.localPlayerService.getLocalPlayer();
        if (!localPlayer) return undefined;
        return this.activeGameService.activeGame?.players.find((p) => p.name === localPlayer.name);
    }

    get avatarUrl(): string {
        return this.player ? buildAvatarAssetPath(this.player.avatar, true) : '';
    }

    get attackDiceIconUrl(): string {
        return this.player ? DICE_ICON_MAPPING[this.player.attackBonusDiceType] : '';
    }

    get defenseDiceIconUrl(): string {
        return this.player ? DICE_ICON_MAPPING[this.player.defenseBonusDiceType] : '';
    }
}
