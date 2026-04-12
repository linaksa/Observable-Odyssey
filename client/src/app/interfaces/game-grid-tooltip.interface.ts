import { CellType } from '@common/board';
import { IItem } from '@common/items';

export interface TooltipTarget {
    rowIndex: number;
    colIndex: number;
}

export interface GameGridTooltipPointer {
    x: number;
    y: number;
}

export interface GameGridTooltipDependencies {
    cells: () => CellType[][];
    objects: () => readonly IItem[] | null;
    getObjectAt: () => (rowIndex: number, colIndex: number) => IItem | null;
    showTooltip: () => boolean;
    getTooltipText: () => ((rowIndex: number, colIndex: number, cellType: CellType, item: IItem | null) => string | null) | null;
    getGridContainer: () => HTMLElement | null;
    getTooltipElement: () => HTMLElement | null;
}
