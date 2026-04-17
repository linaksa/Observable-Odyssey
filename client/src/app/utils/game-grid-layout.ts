import { CELL_TYPE_BACKGROUNDS, CELL_TYPE_PATHS, ITEM_TYPE_PATHS, OBJECT_IMAGES, OBJECT_SPECIFIC_CLASSES } from '@app/constants/backgrounds-mapping';
import { CELL_PREVIEW_OVERLAY_CLASS, ITEM_PREVIEW_OVERLAY_CLASS, SANCTUARY_ITEM_SIZE, SINGLE_ITEM_SIZE } from '@app/constants/game-grid-layout';
import { PlacementPreview } from '@app/interfaces/game-grid.interface';
import { isSanctuaryItem } from '@app/utils/sanctuary';
import { CellType } from '@common/board';
import { IItem, ItemType } from '@common/items';

export function buildCellImagePath(cellType: CellType): string {
    return CELL_TYPE_PATHS[cellType];
}

export function buildCellBackgroundClass(cellType: CellType): string {
    return CELL_TYPE_BACKGROUNDS[cellType];
}

export function buildItemImagePath(item: IItem): string {
    return ITEM_TYPE_PATHS[item.itemType];
}

export function buildItemBackgroundClass(item: IItem): string {
    return joinClasses(OBJECT_IMAGES[item.itemType], OBJECT_SPECIFIC_CLASSES[item.itemType], isInactiveSanctuary(item) ? 'opacity-50' : '');
}

export function buildItemTop(item: IItem, rowIndex: number): string {
    if (!isSanctuaryItem(item)) {
        return '0';
    }

    return rowIndex === item.y ? '0' : '-100%';
}

export function buildItemLeft(item: IItem, colIndex: number): string {
    if (!isSanctuaryItem(item)) {
        return '0';
    }

    return colIndex === item.x ? '0' : '-100%';
}

export function buildItemWidth(item: IItem): string {
    return isSanctuaryItem(item) ? SANCTUARY_ITEM_SIZE : SINGLE_ITEM_SIZE;
}

export function buildItemHeight(item: IItem): string {
    return isSanctuaryItem(item) ? SANCTUARY_ITEM_SIZE : SINGLE_ITEM_SIZE;
}

export function isInactiveSanctuary(item: IItem): boolean {
    return isSanctuaryItem(item) && item.active === false;
}

export function buildItemBackgroundPosition(item: IItem, rowIndex: number, colIndex: number): string {
    if (!isSanctuaryItem(item)) {
        return '';
    }

    const relativeRow = rowIndex - item.y;
    const relativeCol = colIndex - item.x;

    if (relativeRow === 0 && relativeCol === 0) {
        return '0% 0%';
    }

    if (relativeRow === 0 && relativeCol === 1) {
        return '100% 0%';
    }

    if (relativeRow === 1 && relativeCol === 0) {
        return '0% 100%';
    }

    if (relativeRow === 1 && relativeCol === 1) {
        return '100% 100%';
    }

    return '';
}

export function isPreviewCell(preview: PlacementPreview | null, rowIndex: number, colIndex: number): boolean {
    if (!preview) {
        return false;
    }

    if (preview.cellType !== undefined) {
        return preview.rowIndex === rowIndex && preview.colIndex === colIndex;
    }

    if (preview.itemType !== undefined && isSanctuaryItemType(preview.itemType)) {
        return rowIndex >= preview.rowIndex && rowIndex <= preview.rowIndex + 1 && colIndex >= preview.colIndex && colIndex <= preview.colIndex + 1;
    }

    return preview.rowIndex === rowIndex && preview.colIndex === colIndex;
}

export function previewCellBackgroundClass(preview: PlacementPreview | null): string {
    if (!preview) {
        return '';
    }

    if (preview.cellType !== undefined) {
        return joinClasses(CELL_PREVIEW_OVERLAY_CLASS, CELL_TYPE_BACKGROUNDS[preview.cellType]);
    }

    if (preview.itemType !== undefined) {
        return joinClasses(ITEM_PREVIEW_OVERLAY_CLASS, OBJECT_IMAGES[preview.itemType], OBJECT_SPECIFIC_CLASSES[preview.itemType]);
    }

    return '';
}

export function previewCellBackgroundPosition(preview: PlacementPreview | null, rowIndex: number, colIndex: number): string {
    if (!preview?.itemType || !isSanctuaryItemType(preview.itemType)) {
        return '';
    }

    const relativeRow = rowIndex - preview.rowIndex;
    const relativeCol = colIndex - preview.colIndex;

    if (relativeRow === 0 && relativeCol === 0) {
        return '0% 0%';
    }

    if (relativeRow === 0 && relativeCol === 1) {
        return '100% 0%';
    }

    if (relativeRow === 1 && relativeCol === 0) {
        return '0% 100%';
    }

    if (relativeRow === 1 && relativeCol === 1) {
        return '100% 100%';
    }

    return '';
}

export function isSanctuaryItemType(itemType: ItemType): boolean {
    return itemType === ItemType.LifeSanctuary || itemType === ItemType.FightSanctuary;
}

function joinClasses(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}
