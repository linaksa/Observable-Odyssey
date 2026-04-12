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
    protected readonly fightSanctuaryBonus = computed<number>(() => this.resolveFightSanctuaryBonus(this.player()));
    protected readonly avatarUrl = computed<string>(() => {
        const currentPlayer = this.player();
        return currentPlayer ? buildAvatarAssetPath(currentPlayer.avatar, true) : '';
    });
    protected readonly playerName = computed<string>(() => this.player()?.name ?? 'Joueur local indisponible');

    protected readonly attackDisplay = computed<{
        value: number | undefined;
        bonus: number;
        isBuffed: boolean;
    }>(() => {
        return this.statDisplay(this.player()?.attackPoints);
    });

    protected readonly defenseDisplay = computed<{
        value: number | undefined;
        bonus: number;
        isBuffed: boolean;
    }>(() => {
        return this.statDisplay(this.player()?.defensePoints);
    });

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

    protected statDisplay(statValue: number | undefined): { value: number | undefined; bonus: number; isBuffed: boolean } {
        const bonus = this.fightSanctuaryBonus();

        return {
            value: statValue === undefined ? undefined : statValue + bonus,
            bonus,
            isBuffed: bonus > 0,
        };
    }

    private resolveFightSanctuaryBonus(player: ICharacter | undefined): number {
        if (!player || (player.fightSanctuaryTurnsRemaining ?? 0) <= 0) {
            return 0;
        }

        return player.fightSanctuaryBonus ?? 0;
    }
}
