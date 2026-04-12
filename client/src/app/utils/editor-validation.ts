import { BOARD_ERROR_CODES, CARDINAL_DIRECTIONS } from '@app/constants/editor-validation';
import { getErrorMessages } from '@app/utils/error-codes';
import { sanctuaryCoversCell } from '@app/utils/sanctuary';
import { CellType } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { IItem } from '@common/items';

export function buildEditorValidationHighlightedTiles(
    cells: CellType[][],
    items: IItem[],
    errorCodes: readonly ErrorCode[],
): ReadonlySet<number> | null {
    if (!cells.length || !cells[0]?.length || errorCodes.length === 0) {
        return null;
    }

    const highlightedTiles = new Set<number>();

    if (errorCodes.includes(ErrorCode.BoardInvalidDoorPlacement)) {
        addInvalidDoorTiles(highlightedTiles, cells);
    }

    if (errorCodes.includes(ErrorCode.BoardInaccessibleCells)) {
        addInaccessibleTiles(highlightedTiles, cells, items);
    }

    return highlightedTiles.size > 0 ? highlightedTiles : null;
}

export function getEditorBoardErrorMessages(errorCodes: readonly ErrorCode[]): string[] {
    return getErrorMessages(errorCodes.filter((errorCode) => BOARD_ERROR_CODES.has(errorCode)));
}

function addInvalidDoorTiles(highlightedTiles: Set<number>, cells: CellType[][]): void {
    const cols = cells[0].length;

    for (let row = 0; row < cells.length; row++) {
        for (let col = 0; col < cols; col++) {
            const cell = cells[row][col];

            if ((cell === CellType.OpenDoor || cell === CellType.ClosedDoor) && !isDoorPlacementValid(cells, row, col)) {
                highlightedTiles.add(getCellIndex(row, col, cols));
            }
        }
    }
}

function addInaccessibleTiles(highlightedTiles: Set<number>, cells: CellType[][], items: IItem[]): void {
    const rows = cells.length;
    const cols = cells[0].length;
    const blockedCells = getBlockedCells(items);
    const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

    let startRow = -1;
    let startCol = -1;

    for (let row = 0; row < rows && startRow === -1; row++) {
        for (let col = 0; col < cols; col++) {
            if (cells[row][col] !== CellType.Wall && !blockedCells.has(getCellKey(row, col))) {
                startRow = row;
                startCol = col;
                break;
            }
        }
    }

    if (startRow === -1) {
        addAllWalkableTiles(highlightedTiles, cells, blockedCells);
        return;
    }

    const queue: [number, number][] = [[startRow, startCol]];
    visited[startRow][startCol] = true;

    while (queue.length > 0) {
        const [row, col] = queue.shift() as [number, number];

        for (const [rowOffset, colOffset] of CARDINAL_DIRECTIONS) {
            const nextRow = row + rowOffset;
            const nextCol = col + colOffset;

            if (isVisitableCell(cells, visited, nextRow, nextCol, blockedCells)) {
                visited[nextRow][nextCol] = true;
                queue.push([nextRow, nextCol]);
            }
        }
    }

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (cells[row][col] !== CellType.Wall && !blockedCells.has(getCellKey(row, col)) && !visited[row][col]) {
                highlightedTiles.add(getCellIndex(row, col, cols));
            }
        }
    }
}

function addAllWalkableTiles(highlightedTiles: Set<number>, cells: CellType[][], blockedCells: Set<string> = new Set<string>()): void {
    const cols = cells[0].length;

    for (let row = 0; row < cells.length; row++) {
        for (let col = 0; col < cols; col++) {
            const cell = cells[row][col];

            if (cell !== CellType.Wall && cell !== CellType.OpenDoor && cell !== CellType.ClosedDoor && !blockedCells.has(getCellKey(row, col))) {
                highlightedTiles.add(getCellIndex(row, col, cols));
            }
        }
    }
}

function isDoorPlacementValid(cells: CellType[][], row: number, col: number): boolean {
    return isHorizontalDoorPlacementValid(cells, row, col) || isVerticalDoorPlacementValid(cells, row, col);
}

function isHorizontalDoorPlacementValid(cells: CellType[][], row: number, col: number): boolean {
    return isWall(cells, row, col - 1) && isWall(cells, row, col + 1) && isTerrain(cells, row - 1, col) && isTerrain(cells, row + 1, col);
}

function isVerticalDoorPlacementValid(cells: CellType[][], row: number, col: number): boolean {
    return isWall(cells, row - 1, col) && isWall(cells, row + 1, col) && isTerrain(cells, row, col - 1) && isTerrain(cells, row, col + 1);
}

function isVisitableCell(cells: CellType[][], visited: boolean[][], row: number, col: number, blockedCells: Set<string>): boolean {
    return (
        row >= 0 &&
        row < cells.length &&
        col >= 0 &&
        col < cells[0].length &&
        !visited[row][col] &&
        cells[row][col] !== CellType.Wall &&
        !blockedCells.has(getCellKey(row, col))
    );
}

function isWall(cells: CellType[][], row: number, col: number): boolean {
    return isInBounds(cells, row, col) && cells[row][col] === CellType.Wall;
}

function isTerrain(cells: CellType[][], row: number, col: number): boolean {
    return isInBounds(cells, row, col) && isTerrainCell(cells[row][col]);
}

function isInBounds(cells: CellType[][], row: number, col: number): boolean {
    return row >= 0 && row < cells.length && col >= 0 && col < cells[0].length;
}

function getBlockedCells(items: IItem[]): Set<string> {
    const blockedCells = new Set<string>();

    for (const item of items) {
        if (!sanctuaryCoversCell(item, item.y, item.x)) {
            continue;
        }

        for (let row = item.y; row <= item.y + 1; row++) {
            for (let col = item.x; col <= item.x + 1; col++) {
                blockedCells.add(getCellKey(row, col));
            }
        }
    }

    return blockedCells;
}

function isTerrainCell(cell: CellType): boolean {
    return cell !== CellType.Wall && cell !== CellType.OpenDoor && cell !== CellType.ClosedDoor;
}

function getCellIndex(row: number, col: number, cols: number): number {
    return row * cols + col;
}

function getCellKey(row: number, col: number): string {
    return `${row},${col}`;
}
