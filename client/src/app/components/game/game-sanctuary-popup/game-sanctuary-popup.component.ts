import { Component, ChangeDetectionStrategy, input, output } from '@angular/core';
import { SanctuaryChoice, SanctuaryPopupData } from '@common/info';

@Component({
    selector: 'app-game-sanctuary-popup',
    templateUrl: './game-sanctuary-popup.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameSanctuaryPopupComponent {
    readonly data = input.required<SanctuaryPopupData>();
    readonly choiceSelected = output<SanctuaryChoice>();
    readonly cancel = output<void>();
}
