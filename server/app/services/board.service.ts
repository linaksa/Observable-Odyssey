import { CellType, IBoard } from '@common/board';
import { GameSize } from '@common/constants';
import { GameType } from '@common/game';
import { ItemType } from '@common/items';
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

const EXPECTED_TERRAIN_USE = 0.5;

@Service()
export class BoardService {
    /**
     * @description validate the board according to the game rules: more than 50% of surface occupied,
     * no unreachable tile, all starting points are there
     * @returns boolean, if the game is valid or not
     */
    validateBoard(board: IBoard, gameMode: GameType): string[] {
        const errors: string[] = [];
        const gameSize = board.cells.length * board.cells[0].length;
        let occupiedCells = 0;
        for (const row of board.cells) {
            for (const cell of row) {
                if (cell !== CellType.Empty) {
                    occupiedCells++;
                }
            }
        }

        if (occupiedCells <= gameSize * EXPECTED_TERRAIN_USE) {
            errors.push('Moins de 50% de la surface totale de la carte est couverte par des tuiles.');
        }

        const expectedCounts = this.getExpectedCounts(gameSize);
        if (!expectedCounts) {
            errors.push('La taille de la carte est invalide.');
            return errors;
        }

        for (const item of board.items) {
            if (item.itemType === ItemType.FightSanctuary) {
                expectedCounts.expectedFightSanctuaries--;
            } else if (item.itemType === ItemType.LifeSanctuary) {
                expectedCounts.expectedLifeSanctuaries--;
            } else if (item.itemType === ItemType.StartingPosition) {
                expectedCounts.expectedStartingPoints--;
            }
        }

        if (expectedCounts.expectedStartingPoints !== 0) {
            errors.push('Le nombre de positions de départ est invalide.');
        }

        if (expectedCounts.expectedFightSanctuaries !== 0) {
            errors.push('Le nombre de sanctuaires de combat est invalide.');
        }

        if (expectedCounts.expectedLifeSanctuaries !== 0) {
            errors.push('Le nombre de sanctuaires de vie est invalide.');
        }

        if (!this.areAllCellsReachable(board)) {
            errors.push('Toutes les cellules de la carte ne sont pas accessibles.');
        }
        this.validateGameModeRules(board, gameMode, errors);

        return errors;
    }

    private validateGameModeRules(board: IBoard, gameMode: GameType, errors: string[]): void {
        if (gameMode === GameType.Ctf) {
            const flagCount = board.items.filter((item) => item.itemType === ItemType.Flag).length;

            if (flagCount === 0) {
                errors.push('En mode Capture The Flag, un drapeau doit être placé sur la carte.');
            }
        }
    }

    /**
     * @description Get expected counts for sanctuaries and starting points based on game size
     * @returns Object with expected counts or null if game size is invalid
     */
    private getExpectedCounts(gameSize: number): {
        expectedStartingPoints: number;
        expectedLifeSanctuaries: number;
        expectedFightSanctuaries: number;
    } | null {
        if (gameSize === GameSize.Small) {
            return {
                expectedStartingPoints: ExpectedStartingPoints.Small,
                expectedLifeSanctuaries: ExpectedSanctuaries.Small,
                expectedFightSanctuaries: ExpectedSanctuaries.Small,
            };
        } else if (gameSize === GameSize.Mid) {
            return {
                expectedStartingPoints: ExpectedStartingPoints.Mid,
                expectedLifeSanctuaries: ExpectedSanctuaries.Mid,
                expectedFightSanctuaries: ExpectedSanctuaries.Mid,
            };
        } else if (gameSize === GameSize.Large) {
            return {
                expectedStartingPoints: ExpectedStartingPoints.Large,
                expectedLifeSanctuaries: ExpectedSanctuaries.Large,
                expectedFightSanctuaries: ExpectedSanctuaries.Large,
            };
        }
        return null;
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
            [0, 1],
        ];

        while (queue.length > 0) {
            const current = queue.shift();
            const [row, col] = current;

            for (const [dRow, dCol] of directions) {
                const newRow = row + dRow;
                const newCol = col + dCol;

                if (
                    newRow >= 0 &&
                    newRow < rows &&
                    newCol >= 0 &&
                    newCol < cols &&
                    !visited[newRow][newCol] &&
                    board.cells[newRow][newCol] !== CellType.Wall
                ) {
                    visited[newRow][newCol] = true;
                    queue.push([newRow, newCol]);
                }
            }
        }
    }
}
