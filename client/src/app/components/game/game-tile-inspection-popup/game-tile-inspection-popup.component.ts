import { Component, ChangeDetectionStrategy, input } from '@angular/core';
import { TileInfoPopupData } from '@common/info';

@Component({
    selector: 'app-game-tile-inspection-popup',
    templateUrl: './game-tile-inspection-popup.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameTileInspectionPopupComponent {
    readonly data = input.required<TileInfoPopupData>();
}
