import { Component, Input } from '@angular/core';
import { AttackStats } from '@common/attackResult';

@Component({
    selector: 'app-combat-turn-result',
    imports: [],
    templateUrl: './combat-turn-result.component.html',
})
export class CombatTurnResultComponent {
    @Input() turnStats: AttackStats;
    @Input() receivedDamage: number;
}
