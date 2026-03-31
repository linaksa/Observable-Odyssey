import { CellType, IBoard } from '@common/board';
import { sanctuaryCoversCell } from '@common/sanctuary';
import { Service } from 'typedi';
import { IBoardValidator } from './board-validator.interface';

@Service()
export class ReachabilityValidator implements IBoardValidator {
    validate(board: IBoard): string[] {
        const errors: string[] = [];

        if (!this.areAllCellsReachable(board)) {
            errors.push('Toutes les cellules de la carte ne sont pas accessibles.');
        }

        return errors;
    }

    private areAllCellsReachable(board: IBoard): boolean {
        const rows = board.cells.length;
        const cols = board.cells[0].length;
        const visited: boolean[][] = Array.from({ length: rows }, () => Array(cols).fill(false));
        const blockedCells = this.getBlockedCells(board);

        let startRow = -1;
        let startCol = -1;
        for (let i = 0; i < rows && startRow === -1; i++) {
            for (let j = 0; j < cols; j++) {
                if (board.cells[i][j] !== CellType.Wall && !blockedCells.has(`${i},${j}`)) {
                    startRow = i;
                    startCol = j;
                    break;
                }
            }
        }

        if (startRow === -1) {
            return false;
        }

        this.floodFill(board, visited, startRow, startCol, blockedCells);

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (board.cells[i][j] !== CellType.Wall && !blockedCells.has(`${i},${j}`) && !visited[i][j]) {
                    return false;
                }
            }
        }

        return true;
    }

    private floodFill(board: IBoard, visited: boolean[][], startRow: number, startCol: number, blockedCells: Set<string>): void {
        const queue: [number, number][] = [[startRow, startCol]];
        visited[startRow][startCol] = true;

        const directions = [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
        ];

        while (queue.length > 0) {
            const current = queue.shift() as [number, number];
            const [row, col] = current;

            for (const [dRow, dCol] of directions) {
                const newRow = row + dRow;
                const newCol = col + dCol;

                if (this.isVisitableCell(board, visited, newRow, newCol, blockedCells)) {
                    visited[newRow][newCol] = true;
                    queue.push([newRow, newCol]);
                }
            }
        }
    }

    private isVisitableCell(board: IBoard, visited: boolean[][], row: number, col: number, blockedCells: Set<string>): boolean {
        const rows = board.cells.length;
        const cols = board.cells[0].length;
        return (
            row >= 0 &&
            row < rows &&
            col >= 0 &&
            col < cols &&
            !visited[row][col] &&
            board.cells[row][col] !== CellType.Wall &&
            !blockedCells.has(`${row},${col}`)
        );
    }

    private getBlockedCells(board: IBoard): Set<string> {
        const blockedCells = new Set<string>();

        for (const item of board.items ?? []) {
            if (!item) {
                continue;
            }

            for (let row = item.x; row <= item.x + 1; row++) {
                for (let col = item.y; col <= item.y + 1; col++) {
                    if (sanctuaryCoversCell(item, row, col)) {
                        blockedCells.add(`${row},${col}`);
                    }
                }
            }
        }

        return blockedCells;
    }
}
