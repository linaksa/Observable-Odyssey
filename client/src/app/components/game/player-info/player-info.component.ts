import { Component, inject, OnInit } from '@angular/core';
import { ActiveGameService } from '@app/services/active-game.service';
import { ICharacter } from '@common/character';
import { DiceType } from '@common/constants';

const DICE_ICON_MAPPING: { [key in DiceType]: string } = {
    [DiceType.FourSided]: 'assets/form-page/4_sided_dice.svg',
    [DiceType.SixSided]: 'assets/form-page/6_sided_dice.svg',
};

@Component({
    selector: 'app-player-info',
    imports: [],
    templateUrl: './player-info.component.html',
})
export class PlayerInfoComponent implements OnInit {
    protected readonly activeGameService = inject(ActiveGameService);
    player: ICharacter | undefined;

    ngOnInit() {
        this.player = this.activeGameService.getPlayerByName(this.activeGameService.playerName);
    }

    get avatarUrl(): string {
        return this.player ? `assets/form-page/${this.player.avatar}.png` : '';
    }

    get attackDiceIconUrl(): string {
        return this.player ? DICE_ICON_MAPPING[this.player.attackBonusDiceType] : '';
    }

    get defenseDiceIconUrl(): string {
        return this.player ? DICE_ICON_MAPPING[this.player.defenseBonusDiceType] : '';
    }
}
