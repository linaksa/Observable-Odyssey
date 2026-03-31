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

        console.log('players before sorting:', players);
        console.log(`Ordering players by ${StatOrderArgs[orderArg]} in ${OrderDirection[this.direction]} order.`);

        this.currentOrderArg = orderArg;

        players = players.sort((a, b) => {
            switch (orderArg) {
                case StatOrderArgs.nCombat:
                    return b.nCombats - a.nCombats;
                case StatOrderArgs.nDamageDealt:
                    return b.totalDamageDealt - a.totalDamageDealt;
                case StatOrderArgs.nDamageTaken:
                    return b.totalDamageReceived - a.totalDamageReceived;
                case StatOrderArgs.nVisitedCells:
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
