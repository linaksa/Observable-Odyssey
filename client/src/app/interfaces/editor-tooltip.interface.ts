import { CellType } from '@common/board';
import { IItem } from '@common/items';

export interface EditorTooltipContext {
    cellType: CellType;
    item: IItem | null;
    rowIndex: number;
    colIndex: number;
}

export interface EditorTooltipData {
    tileName: string;
    objectName?: string;
    errorMessage?: string;
}
