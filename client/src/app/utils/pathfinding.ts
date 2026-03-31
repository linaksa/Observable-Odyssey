import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { PRIX_EAU, PRIX_GLACE, PRIX_PORTE_GAZON } from '@common/constants';
import { IItem } from '@common/items';
import { sanctuaryCoversCell } from '@app/utils/sanctuary';

export function buildGraph(board: CellType[][], items: IItem[] = [], players: ICharacter[] = []): [number, number][][] {
    const blockedCells = buildBlockedCells(items, players);
    return buildAdjacencyGraph(board, blockedCells);
}

function buildBlockedCells(items: IItem[], players: ICharacter[]): Set<string> {
    const blockedCells = new Set<string>();

    addSanctuaryBlockedCells(blockedCells, items);
    addPlayerBlockedCells(blockedCells, players);

    return blockedCells;
}

function addSanctuaryBlockedCells(blockedCells: Set<string>, items: IItem[]): void {
    for (const item of items) {
        if (!sanctuaryCoversCell(item, item.x, item.y)) {
            continue;
        }

        for (let row = item.x; row <= item.x + 1; row++) {
            for (let col = item.y; col <= item.y + 1; col++) {
                blockedCells.add(`${row},${col}`);
            }
        }
    }
}

function addPlayerBlockedCells(blockedCells: Set<string>, players: ICharacter[]): void {
    for (const player of players) {
        blockedCells.add(`${player.positionGrille.y},${player.positionGrille.x}`);
    }
}

function buildAdjacencyGraph(board: CellType[][], blockedCells: Set<string>): [number, number][][] {
    const totalRows = board.length;
    const totalColumns = board[0].length;

    const graph: [number, number][][] = Array(totalRows * totalColumns)
        .fill(null)
        .map(() => []);

    const getIndex = (row: number, column: number) => row * totalColumns + column;

    const movementDirections = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
    ];

    for (let currentRow = 0; currentRow < totalRows; currentRow++) {
        for (let currentColumn = 0; currentColumn < totalColumns; currentColumn++) {
            const currentNodeIndex = getIndex(currentRow, currentColumn);

            for (const [rowOffset, columnOffset] of movementDirections) {
                const neighborRow = currentRow + rowOffset;
                const neighborColumn = currentColumn + columnOffset;

                if (neighborRow < 0 || neighborRow >= totalRows || neighborColumn < 0 || neighborColumn >= totalColumns) {
                    continue;
                }

                const tileWeight = getTileCost(board[neighborRow][neighborColumn], neighborRow, neighborColumn, blockedCells);

                if (!isFinite(tileWeight)) {
                    continue;
                }

                graph[currentNodeIndex].push([getIndex(neighborRow, neighborColumn), tileWeight]);
            }
        }
    }

    return graph;
}

function getTileCost(tileType: CellType, row: number, col: number, blockedCells: Set<string>): number {
    if (blockedCells.has(`${row},${col}`)) {
        return Infinity;
    }

    switch (tileType) {
        case CellType.Empty:
            return PRIX_PORTE_GAZON;

        case CellType.Ice:
            return PRIX_GLACE;

        case CellType.OpenDoor:
            return PRIX_PORTE_GAZON;
        case CellType.ClosedDoor:
            return Infinity;

        case CellType.Water:
            return PRIX_EAU;

        case CellType.Wall:
            return Infinity;

        default:
            return PRIX_PORTE_GAZON;
    }
}
