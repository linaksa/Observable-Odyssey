import { sanctuaryCoversCell } from '@app/utils/sanctuary';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { WATER_MOVEMENT_COST, ICE_MOVEMENT_COST, GRASS_OR_DOOR_MOVEMENT_COST } from '@common/constants';
import { IItem } from '@common/items';

export function buildGraph(board: CellType[][], actionPoints: number = 0, items: IItem[] = [], players: ICharacter[] = []): [number, number][][] {
    const blockedCells = buildBlockedCells(items, players);
    return buildAdjacencyGraph(board, blockedCells, actionPoints);
}

function buildBlockedCells(items: IItem[], players: ICharacter[]): Set<string> {
    const blockedCells = new Set<string>();

    addSanctuaryBlockedCells(blockedCells, items);
    addPlayerBlockedCells(blockedCells, players);

    return blockedCells;
}

function addSanctuaryBlockedCells(blockedCells: Set<string>, items: IItem[]): void {
    for (const item of items) {
        if (!sanctuaryCoversCell(item, item.y, item.x)) {
            continue;
        }

        for (let row = item.y; row <= item.y + 1; row++) {
            for (let col = item.x; col <= item.x + 1; col++) {
                blockedCells.add(`${row},${col}`);
            }
        }
    }
}

function addPlayerBlockedCells(blockedCells: Set<string>, players: ICharacter[]): void {
    for (const player of players) {
        if (player.hasAbandoned) {
            continue;
        }
        blockedCells.add(`${player.currentPosition.y},${player.currentPosition.x}`);
    }
}

function buildAdjacencyGraph(board: CellType[][], blockedCells: Set<string>, actionPoints: number): [number, number][][] {
    const totalRows = board.length;
    const totalColumns = board[0].length;

    const graph: [number, number][][] = Array(totalRows * totalColumns)
        .fill(null)
        .map((): [number, number][] => []);

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

                const tileWeight = getTileCost(board[neighborRow][neighborColumn], neighborRow, neighborColumn, blockedCells, actionPoints);

                if (!isFinite(tileWeight)) {
                    continue;
                }

                graph[currentNodeIndex].push([getIndex(neighborRow, neighborColumn), tileWeight]);
            }
        }
    }

    return graph;
}

function getTileCost(tileType: CellType, row: number, col: number, blockedCells: Set<string>, actionPoints: number): number {
    if (blockedCells.has(`${row},${col}`)) {
        return Infinity;
    }

    switch (tileType) {
        case CellType.Empty:
            return GRASS_OR_DOOR_MOVEMENT_COST;

        case CellType.Ice:
            return ICE_MOVEMENT_COST;

        case CellType.OpenDoor:
            return GRASS_OR_DOOR_MOVEMENT_COST;
        case CellType.ClosedDoor:
            return actionPoints > 0 ? GRASS_OR_DOOR_MOVEMENT_COST : Infinity;

        case CellType.Water:
            return WATER_MOVEMENT_COST;

        case CellType.Wall:
            return Infinity;

        default:
            return GRASS_OR_DOOR_MOVEMENT_COST;
    }
}
