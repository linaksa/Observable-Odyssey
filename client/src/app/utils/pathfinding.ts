import { CellType } from '@common/board';

export function buildGraph(board: CellType[][]): [number, number][][] {
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

                const tileWeight = getTileCost(board[neighborRow][neighborColumn]);

                if (!isFinite(tileWeight)) {
                    continue;
                }

                graph[currentNodeIndex].push([getIndex(neighborRow, neighborColumn), tileWeight]);
            }
        }
    }

    return graph;
}

function getTileCost(tileType: CellType): number {
    switch (tileType) {
        case CellType.Empty:
            return 1;

        case CellType.Ice:
            return 0;

        case CellType.OpenDoor:
            return 0;
        case CellType.ClosedDoor:
            return Infinity;

        case CellType.Water:
            return 2;

        case CellType.Wall:
            return Infinity;

        default:
            return 1;
    }
}
