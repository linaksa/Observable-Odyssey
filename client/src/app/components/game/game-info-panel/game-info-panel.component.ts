import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MessageZoneComponent } from '@app/components/common/message-zone/message-zone.component';
import { GamePlayerListComponent } from '@app/components/game/game-player-list/game-player-list.component';
import { GAME_INFO_PANEL_HOST_BINDINGS } from '@app/constants/component-host-bindings';

@Component({
    selector: 'app-game-info-panel',
    imports: [GamePlayerListComponent, MessageZoneComponent],
    templateUrl: './game-info-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: GAME_INFO_PANEL_HOST_BINDINGS,
})
export class GameInfoPanelComponent {}
