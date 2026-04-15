import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import {
    FLAG_TRANSFER_ACCEPT_BUTTON_HINT,
    FLAG_TRANSFER_ACCEPT_BUTTON_LABEL,
    FLAG_TRANSFER_ACCEPT_TAKE_BUTTON_LABEL,
    FLAG_TRANSFER_POPUP_HEADER_LABEL,
    FLAG_TRANSFER_POPUP_WAITING_SUBTITLE,
    FLAG_TRANSFER_REJECT_BUTTON_HINT,
    FLAG_TRANSFER_REJECT_BUTTON_LABEL,
} from '@app/constants/gameplay';
import { PendingFlagRequest } from '@app/interfaces/pending-flag-request.interface';
import { HUNDRED_PERCENT, MILLISECONDS_PER_SECOND, TURN_TIME_MS } from '@common/constants';
import { SocketEvent } from '@common/socket-events';

@Component({
    selector: 'app-game-flag-transfer-popup',
    templateUrl: './game-flag-transfer-popup.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameFlagTransferPopupComponent {
    readonly request = input<PendingFlagRequest | null>(null);
    readonly turnTimeLeftSeconds = input<number | null>(null);
    readonly decision = output<boolean>();

    protected readonly headerLabel = FLAG_TRANSFER_POPUP_HEADER_LABEL;
    protected readonly waitingSubtitle = FLAG_TRANSFER_POPUP_WAITING_SUBTITLE;
    protected readonly acceptButtonHint = FLAG_TRANSFER_ACCEPT_BUTTON_HINT;
    protected readonly rejectButtonLabel = FLAG_TRANSFER_REJECT_BUTTON_LABEL;
    protected readonly rejectButtonHint = FLAG_TRANSFER_REJECT_BUTTON_HINT;

    protected readonly isVisible = computed(() => this.request() !== null);
    protected readonly canRespond = computed(() => this.request()?.canRespond ?? false);
    protected readonly question = computed(() => this.request()?.question ?? '');
    protected readonly acceptButtonLabel = computed(() =>
        this.request()?.acceptEvent === SocketEvent.GiveFlag ? FLAG_TRANSFER_ACCEPT_TAKE_BUTTON_LABEL : FLAG_TRANSFER_ACCEPT_BUTTON_LABEL,
    );
    protected readonly turnTimerPercent = computed(() => {
        const timeLeft = this.turnTimeLeftSeconds();
        if (timeLeft === null) {
            return 0;
        }

        return Math.max(0, (timeLeft / (TURN_TIME_MS / MILLISECONDS_PER_SECOND)) * HUNDRED_PERCENT);
    });
}
