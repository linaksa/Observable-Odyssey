import { ChangeDetectionStrategy, Component, ElementRef, input, ViewChild } from '@angular/core';
import { TileInfoPopupData } from '@common/info';
import type { TooltipPosition } from '@app/utils/tooltip-position.utils';

@Component({
    selector: 'app-game-tile-inspection-popup',
    templateUrl: './game-tile-inspection-popup.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameTileInspectionPopupComponent {
    readonly data = input.required<TileInfoPopupData>();
    readonly position = input<TooltipPosition>({ x: 0, y: 0 });

    @ViewChild('tooltipElement', { read: ElementRef })
    private tooltipElementRef?: ElementRef<HTMLElement>;

    get tooltipElement(): HTMLElement | null {
        return this.tooltipElementRef?.nativeElement ?? null;
    }
}
