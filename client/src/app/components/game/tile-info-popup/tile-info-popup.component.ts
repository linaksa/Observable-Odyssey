import { CommonModule } from '@angular/common';
import { Component, input } from '@angular/core';
import { TileInfoPopupData } from '@common/info';

@Component({
    selector: 'app-tile-info-popup',
    imports: [CommonModule],
    templateUrl: './tile-info-popup.component.html',
})
export class TileInfoPopupComponent {
    data = input.required<TileInfoPopupData>();
}
