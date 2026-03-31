import { Component, inject, Input, OnInit } from '@angular/core';
import { OrderDirection, StatOrderArgs } from '@app/constants/stats';
import { StatOrderService } from '@app/services/end/stat-order.service';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';
import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';
import { HUNDRED_PERCENT } from '@common/constants';

@Component({
    selector: 'app-final-player-list',
    imports: [],
    templateUrl: './final-player-list.component.html',
})
export class FinalPlayerListComponent implements OnInit {
    private statOrderService: StatOrderService = inject(StatOrderService);
    @Input() activeGame: IActiveGame;

    protected orderedPlayers: ICharacter[];
    protected readonly availableStatOrderArgs: typeof StatOrderArgs = StatOrderArgs;

    ngOnInit() {
        this.orderedPlayers = this.activeGame.players;
    }

    orderPlayers(orderArg: StatOrderArgs) {
        const copiedPlayers = this.activeGame.players.map((player) => ({ ...player }));
        this.orderedPlayers = this.statOrderService.orderPlayers(copiedPlayers, orderArg);
    }

    getAvatarUrl(character: ICharacter): string {
        if (!character) return '';
        return buildAvatarAssetPath(character.avatar, true);
    }

    getPlayerVisitedTilesRatio(player: ICharacter): number {
        const totalTiles = Math.pow(this.activeGame.game.board.cells.length, 2);
        return Math.round((player.visitedCells.length / totalTiles) * HUNDRED_PERCENT);
    }

    getOrderDirectionIconPath(orderArg: StatOrderArgs): string {
        if (this.statOrderService.currentOrderArg !== orderArg) {
            return 'assets/end/arrow-down-arrow-up.svg';
        }

        if (this.statOrderService.direction === OrderDirection.Ascending) {
            return 'assets/end/arrow-up.svg';
        } else {
            return 'assets/end/arrow-down.svg';
        }
    }
}
