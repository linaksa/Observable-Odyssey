import { CellType } from '@common/board';
import { IItem, ItemType } from '@common/items';

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
