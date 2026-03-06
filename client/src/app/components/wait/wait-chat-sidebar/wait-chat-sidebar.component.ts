import { CommonModule } from '@angular/common';
import { Component, inject, input, InputSignal } from '@angular/core';
import { ChatPanelComponent } from '@app/components/chat-pannel/chat-pannel.component';
import { ActiveGameService } from '@app/services/active-game.service';
import { ICharacter } from '@common/character';

@Component({
    selector: 'app-wait-chat-sidebar',
    imports: [CommonModule, ChatPanelComponent],
    templateUrl: './wait-chat-sidebar.component.html',
})
export class WaitChatSidebarComponent {
    readonly localPlayer: InputSignal<ICharacter | undefined> = input<ICharacter | undefined>();

    readonly activeGameService: ActiveGameService = inject(ActiveGameService);

    get isStartDisabled(): boolean {
        const players = this.activeGameService.activeGame.players;
        return players.length < 2;
    }

    get canStartGame(): boolean {
        const local = this.localPlayer();
        return !!local && local.name === this.activeGameService.activeGame?.organizerName;
    }
}
