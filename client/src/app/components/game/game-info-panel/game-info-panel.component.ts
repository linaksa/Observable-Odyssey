import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ChatPanelComponent } from '@app/components/chat/chat-panel/chat-panel.component';
import { JournalComponent } from '@app/components/chat/journal/journal.component';
import { GamePlayerListComponent } from '@app/components/game/game-player-list/game-player-list.component';
import { GAME_INFO_PANEL_HOST_BINDINGS } from '@app/constants/component-host-bindings';
import { JOURNAL_TAB_LABELS, JournalTab } from '@app/constants/journal';

@Component({
    selector: 'app-game-info-panel',
    imports: [GamePlayerListComponent, ChatPanelComponent, JournalComponent],
    templateUrl: './game-info-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: GAME_INFO_PANEL_HOST_BINDINGS,
})
export class GameInfoPanelComponent {
    protected readonly journalTab = JournalTab;
    protected readonly journalTabLabels = JOURNAL_TAB_LABELS;
    protected readonly activeTab = signal<JournalTab>(JournalTab.Chat);

    protected setActiveTab(tab: JournalTab): void {
        this.activeTab.set(tab);
    }
}
