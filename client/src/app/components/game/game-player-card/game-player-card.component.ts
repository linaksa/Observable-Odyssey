import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';
import { formatPlayerStatValue } from '@app/utils/player-stat.utils';
import { ICharacter } from '@common/character';
import { DiceType, FOUR_SIDED_DICE_MAX, MAX_PLAYER_ACTIONS, SIX_SIDED_DICE_MAX, VICTORIES_TO_WIN } from '@common/constants';

@Component({
    selector: 'app-game-player-card',
    imports: [NgOptimizedImage],
    templateUrl: './game-player-card.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GamePlayerCardComponent {
    readonly player = input<ICharacter | undefined>(undefined);

    protected readonly playerStatValue = formatPlayerStatValue;
    protected readonly maxPlayerActions = MAX_PLAYER_ACTIONS;
    protected readonly victoriesToWin = VICTORIES_TO_WIN;
    protected readonly avatarUrl = computed<string>(() => {
        const currentPlayer = this.player();
        return currentPlayer ? buildAvatarAssetPath(currentPlayer.avatar, true) : '';
    });
    protected readonly playerName = computed<string>(() => this.player()?.name ?? 'Joueur local indisponible');

    protected victoriesAchieved(player: ICharacter | undefined): number | undefined {
        if (!player) {
            return undefined;
        }

        return Math.max(player.victories, player.nVictories);
    }

    protected diceFaceValue(diceType: DiceType | undefined): number {
        if (!diceType) {
            return 0;
        }
        return diceType === DiceType.FourSided ? FOUR_SIDED_DICE_MAX : SIX_SIDED_DICE_MAX;
    }
}
