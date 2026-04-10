import { DatePipe } from '@angular/common';
import { afterEveryRender, ChangeDetectionStrategy, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { JOURNAL_DATE_FORMAT, JOURNAL_EMPTY_MESSAGE } from '@app/constants/journal';
import { GameLogService } from '@app/services/realtime/game-log.service';
import { IGameLogPayload } from '@common/socket-payloads';

@Component({
    selector: 'app-journal',
    imports: [DatePipe],
    templateUrl: './journal.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JournalComponent implements OnInit {
    private readonly gameLogService = inject(GameLogService);
    private lastLogCount = 0;

    @ViewChild('journalScrollContainer') private journalScrollContainer?: ElementRef<HTMLElement>;

    protected readonly journalDateFormat = JOURNAL_DATE_FORMAT;
    protected readonly journalEmptyMessage = JOURNAL_EMPTY_MESSAGE;

    protected get gameLogs(): readonly IGameLogPayload[] {
        return this.gameLogService.gameLogs();
    }

    constructor() {
        afterEveryRender({
            read: () => {
                const count = this.gameLogs.length;
                if (count === this.lastLogCount) {
                    return;
                }

                this.scrollJournalToBottom();
                this.lastLogCount = count;
            },
        });
    }

    ngOnInit(): void {
        this.gameLogService.connect();
    }

    private scrollJournalToBottom(): void {
        if (!this.journalScrollContainer?.nativeElement) {
            return;
        }

        const element = this.journalScrollContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
    }
}
