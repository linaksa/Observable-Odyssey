import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AttackStats } from '@common/attackResult';

@Component({
    selector: 'app-game-combat-turn-result',
    standalone: true,
    templateUrl: './game-combat-turn-result.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameCombatTurnResultComponent {
    readonly label = input.required<string>();
    readonly turnStats = input.required<AttackStats>();
    readonly receivedDamage = input.required<number>();
}
