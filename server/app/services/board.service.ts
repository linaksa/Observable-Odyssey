import { CellType, GameSize, GameType, ItemType } from '@app/constants';
import { IBoard } from '@app/schemas/board';
import { Service } from 'typedi';


enum ExpectedSanctuaries {
    Small = 1,
    Mid = 2,
    Large = 3,
}

enum ExpectedStartingPoints {
    Small = 2,
    Mid = 4,
    Large = 6,
}

@Service()
export class BoardService {

    /**
     * @description validate the board according to the game rules: more than 50% of surface occupied,
     * no unreachable tile, all starting points are there
     * @returns boolean, if the game is valid or not
     */
    public validateBoard(board: IBoard, gameType: GameType): boolean {
        const gameSize = board.cells.length * board.cells[0].length;
        let occupiedCells = 0;
        for (let i = 0; i < board.cells.length; ++i) {
            for (let j = 0; j < board.cells[0].length; ++j) {
                if (board.cells[i][j] !== CellType.Empty) {
                    occupiedCells++;
                }
            }
        }

        if (occupiedCells <= gameSize * 0.5) {
            return false;
        }

        let expectedStartingPoints = 0;
        let expectedSanctuaries = 0;
        if (gameSize === GameSize.Small) {
            expectedStartingPoints = ExpectedStartingPoints.Small;
            expectedSanctuaries = ExpectedSanctuaries.Small;
        } else if (gameSize == GameSize.Mid) {
            expectedStartingPoints = ExpectedStartingPoints.Mid;
            expectedSanctuaries = ExpectedSanctuaries.Mid;
        } else if (gameSize == GameSize.Large) {
            expectedStartingPoints = ExpectedStartingPoints.Large;
            expectedSanctuaries = ExpectedSanctuaries.Large;
        } else {
            return false;
        }


        for (const item of board.items) {
            if (item.itemType == ItemType.FightSanctuary || item.itemType == ItemType.LifeSanctuary) {
                expectedSanctuaries--;
            } else if (item.itemType == ItemType.StartingPosition) {
                expectedStartingPoints--;
            }
        }

        if (expectedStartingPoints !== 0 || expectedSanctuaries !== 0) {
            return false;
        }

        if (!this.areAllCellsReachable(board)) {
            console.log("Talkin trash to the garbage around you")
            return false
        }

        return true;
    }

    /**
     * @description Check if all non-wall cells are reachable using flood fill
     * @returns True if all cells are reachable, false otherwise
     */
    private areAllCellsReachable(board: IBoard): boolean {
        const rows = board.cells.length;
        const cols = board.cells[0].length;
        const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));

        // Find first non-wall cell as starting point
        let startRow = -1;
        let startCol = -1;
        for (let i = 0; i < rows && startRow === -1; i++) {
            for (let j = 0; j < cols; j++) {
                if (board.cells[i][j] !== CellType.Wall) {
                    startRow = i;
                    startCol = j;
                    break;
                }
            }
        }

        if (startRow === -1) {
            return false;
        }

        // Flood fill from starting point: any cell shoud be reachable from there
        this.floodFill(board, visited, startRow, startCol);

        // Check if all non-wall cells were visited
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (board.cells[i][j] !== CellType.Wall && !visited[i][j]) {
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * Flood fill using BFS
     */
    private floodFill(board: IBoard, visited: boolean[][], startRow: number, startCol: number): void {
        const rows = board.cells.length;
        const cols = board.cells[0].length;
        const queue: [number, number][] = [[startRow, startCol]];
        visited[startRow][startCol] = true;

        const directions = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1]
        ];

        while (queue.length > 0) {
            const [row, col] = queue.shift()!;

            for (const [dRow, dCol] of directions) {
                const newRow = row + dRow;
                const newCol = col + dCol;

                if (newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols && !visited[newRow][newCol] && board.cells[newRow][newCol] !== CellType.Wall
                ) {
                    visited[newRow][newCol] = true;
                    queue.push([newRow, newCol]);
                }
            }
        }
    }
}
