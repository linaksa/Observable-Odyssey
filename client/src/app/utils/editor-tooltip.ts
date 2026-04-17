import { ITEM_INFO_BY_TYPE, TILE_INFO_BY_TYPE, UNKNOWN_ITEM_INFO, UNKNOWN_TILE_INFO } from '@app/constants/tile-info';
import { EditorTooltipContext, EditorTooltipData } from '@app/interfaces/editor-tooltip.interface';
import { buildEditorValidationHighlightedTiles } from '@app/utils/editor-validation';
import { getErrorMessage } from '@app/utils/error-codes';
import { ErrorCode } from '@common/error-codes';
import { CellType } from '@common/board';
import { IItem } from '@common/items';

export function buildEditorTooltipText(
    context: EditorTooltipContext,
    cells: CellType[][],
    items: IItem[],
    errorCodes: readonly ErrorCode[],
): string | null {
    const data = buildEditorTooltipData(context, cells, items, errorCodes);

    if (!data) {
        return null;
    }

    const parts: string[] = [data.tileName];

    if (data.objectName) {
        parts.push(data.objectName);
    }

    if (data.errorMessage) {
        parts.push(`⚠ ${data.errorMessage}`);
    }

    return parts.join('\n');
}

export function buildEditorTooltipData(
    context: EditorTooltipContext,
    cells: CellType[][],
    items: IItem[],
    errorCodes: readonly ErrorCode[],
): EditorTooltipData | null {
    const tileInfo = TILE_INFO_BY_TYPE[context.cellType];
    const tileName = tileInfo?.title ?? UNKNOWN_TILE_INFO.title;
    const objectName = context.item ? (ITEM_INFO_BY_TYPE[context.item.itemType]?.title ?? UNKNOWN_ITEM_INFO.title) : undefined;
    const highlightedTiles = buildEditorValidationHighlightedTiles(cells, items, errorCodes);
    const cellIndex = context.rowIndex * (cells[0]?.length ?? 0) + context.colIndex;

    return {
        tileName,
        objectName,
        errorMessage: highlightedTiles?.has(cellIndex) ? getShortErrorMessage(errorCodes) : undefined,
    };
}

function getShortErrorMessage(errorCodes: readonly ErrorCode[]): string {
    if (errorCodes.includes(ErrorCode.BoardInvalidDoorPlacement)) {
        return 'Porte mal placée';
    }

    if (errorCodes.includes(ErrorCode.BoardInaccessibleCells)) {
        return 'Case inaccessible';
    }

    return getErrorMessage(errorCodes[0]);
}
