import { Component, Input } from '@angular/core';
import { IActiveGame } from '@common/activeGame';

@Component({
    selector: 'app-global-stats',
    imports: [],
    templateUrl: './global-stats.component.html',
})
export class GlobalStatsComponent {
    @Input() activeGame: IActiveGame;
}
