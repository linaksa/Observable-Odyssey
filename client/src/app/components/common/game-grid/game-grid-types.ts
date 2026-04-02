import { CellType } from '@common/board';
import { IItem, ItemType } from '@common/items';
import type { TooltipPosition as CursorFollowingTooltipPosition } from '@app/components/common/tooltip/cursor-following-tooltip.controller';

export type TooltipPosition = CursorFollowingTooltipPosition;

export interface PlacementPreview {
    rowIndex: number;
    colIndex: number;
    cellType?: CellType;
    itemType?: ItemType;
}

export interface GameGridCellEvent {
    rowIndex: number;
    colIndex: number;
    cellType: CellType;
    item: IItem | null;
    event: MouseEvent;
}
