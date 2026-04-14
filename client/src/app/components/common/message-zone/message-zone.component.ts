import { Component, signal } from '@angular/core';
import { ChatPanelComponent } from '@app/components/chat/chat-panel/chat-panel.component';
import { JournalComponent } from '@app/components/chat/journal/journal.component';
import { MESSAGE_ZONE_HOST_BINDINGS } from '@app/constants/component-host-bindings';
import { JOURNAL_DEFAULT_TAB, JOURNAL_TAB_LABELS, JournalTab } from '@app/constants/journal';

@Component({
    selector: 'app-message-zone',
    imports: [ChatPanelComponent, JournalComponent],
    templateUrl: './message-zone.component.html',
    host: MESSAGE_ZONE_HOST_BINDINGS,
})
export class MessageZoneComponent {
    protected readonly journalTab = JournalTab;
    protected readonly journalTabLabels = JOURNAL_TAB_LABELS;
    protected readonly activeTab = signal<JournalTab>(JOURNAL_DEFAULT_TAB);

    protected setActiveTab(tab: JournalTab): void {
        this.activeTab.set(tab);
    }
}
