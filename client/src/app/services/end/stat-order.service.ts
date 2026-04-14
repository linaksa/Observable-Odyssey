import { Injectable } from '@angular/core';
import { OrderDirection, StatOrderArgs } from '@app/constants/stats';
import { ICharacter } from '@common/character';

@Injectable({
    providedIn: 'root',
})
export class StatOrderService {
    currentOrderArg: StatOrderArgs | null;
    direction: OrderDirection = OrderDirection.Descending;

    orderPlayers(players: ICharacter[], orderArg: StatOrderArgs): ICharacter[] {
        if (this.currentOrderArg === orderArg) {
            this.toggleDirection();
        } else {
            this.direction = OrderDirection.Descending;
        }

        this.currentOrderArg = orderArg;

        players = players.sort((a, b) => {
            switch (orderArg) {
                case StatOrderArgs.NCombats:
                    return b.nCombats - a.nCombats;
                case StatOrderArgs.NDamageDealt:
                    return b.totalDamageDealt - a.totalDamageDealt;
                case StatOrderArgs.NDamageTaken:
                    return b.totalDamageReceived - a.totalDamageReceived;
                case StatOrderArgs.NVisitedCells:
                    return b.visitedCells.length - a.visitedCells.length;
                default:
                    return 0;
            }
        });

        if (this.direction === OrderDirection.Descending) {
            players = players.reverse();
        }

        return players;
    }

    private toggleDirection() {
        if (this.direction === OrderDirection.Ascending) {
            this.direction = OrderDirection.Descending;
        } else {
            this.direction = OrderDirection.Ascending;
        }
    }
}
