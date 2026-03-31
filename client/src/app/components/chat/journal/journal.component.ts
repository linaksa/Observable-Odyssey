import { DatePipe } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, OnInit, ViewChild, inject } from '@angular/core';
import { JOURNAL_DATE_FORMAT, JOURNAL_DEFAULT_TAB, JOURNAL_EMPTY_MESSAGE, JOURNAL_TAB_LABELS, JournalTab } from '@app/constants/journal';
import { ChatPanelComponent } from '@app/components/chat/chat-pannel/chat-pannel.component';
import { GameLogService } from '@app/services/realtime/game-log.service';
import { IGameLogPayload } from '@common/socket-payloads';

@Component({
    selector: 'app-journal',
    imports: [ChatPanelComponent, DatePipe],
    templateUrl: './journal.component.html',
})
export class JournalComponent implements OnInit, AfterViewChecked {
    private readonly gameLogService = inject(GameLogService);
    private lastLogCount = 0;

    @ViewChild('journalScrollContainer') private journalScrollContainer?: ElementRef<HTMLElement>;

    protected readonly journalTab = JournalTab;
    protected readonly journalTabLabels = JOURNAL_TAB_LABELS;
    protected readonly journalDateFormat = JOURNAL_DATE_FORMAT;
    protected readonly journalEmptyMessage = JOURNAL_EMPTY_MESSAGE;
    protected activeTab: JournalTab = JOURNAL_DEFAULT_TAB;

    protected get gameLogs(): readonly IGameLogPayload[] {
        return this.gameLogService.gameLogs();
    }

    ngOnInit(): void {
        this.gameLogService.connect();
    }

    protected setActiveTab(tab: JournalTab): void {
        this.activeTab = tab;
    }

    ngAfterViewChecked(): void {
        if (this.activeTab !== JournalTab.Journal) {
            return;
        }

        const count = this.gameLogs.length;
        if (count !== this.lastLogCount) {
            this.scrollJournalToBottom();
            this.lastLogCount = count;
        }
    }

    private scrollJournalToBottom(): void {
        if (!this.journalScrollContainer?.nativeElement) {
            return;
        }

        const el = this.journalScrollContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
    }
}
