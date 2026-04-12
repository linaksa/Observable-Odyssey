import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { HUNDRED_PERCENT, MILLISECONDS_PER_SECOND, TURN_TIME_MS } from '@common/constants';
import { SanctuaryChoice, SanctuaryPopupData } from '@common/info';

@Component({
    selector: 'app-game-sanctuary-popup',
    templateUrl: './game-sanctuary-popup.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameSanctuaryPopupComponent {
    protected readonly sanctuaryChoice = SanctuaryChoice;
    readonly data = input.required<SanctuaryPopupData>();
    readonly turnTimeLeftSeconds = input<number | null>(null);
    readonly choiceSelected = output<SanctuaryChoice>();
    readonly cancel = output<void>();

    protected readonly turnTimerPercent = computed(() => {
        const timeLeft = this.turnTimeLeftSeconds();

        if (timeLeft === null) {
            return 0;
        }

        return Math.max(0, (timeLeft / (TURN_TIME_MS / MILLISECONDS_PER_SECOND)) * HUNDRED_PERCENT);
    });
}
