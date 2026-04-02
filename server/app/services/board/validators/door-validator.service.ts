import { CellType, IBoard } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { Service } from 'typedi';
import { IBoardValidator } from './board-validator.interface';

@Service()
export class DoorValidator implements IBoardValidator {
    validate(board: IBoard): ErrorCode[] {
        const errors: ErrorCode[] = [];

        for (const [i, row] of board.cells.entries()) {
            for (const [j, cell] of row.entries()) {
                if (cell === CellType.OpenDoor || cell === CellType.ClosedDoor) {
                    if (!this.isDoorPlacementValid(board, i, j)) {
                        errors.push(ErrorCode.BoardInvalidDoorPlacement);
                        return errors;
                    }
                }
            }
        }

        return errors;
    }

    private isDoorPlacementValid(board: IBoard, row: number, col: number): boolean {
        const isHorizontalValid =
            this.isWall(board, row, col - 1) &&
            this.isWall(board, row, col + 1) &&
            this.isTerrain(board, row - 1, col) &&
            this.isTerrain(board, row + 1, col);

        const isVerticalValid =
            this.isWall(board, row - 1, col) &&
            this.isWall(board, row + 1, col) &&
            this.isTerrain(board, row, col - 1) &&
            this.isTerrain(board, row, col + 1);

        return isHorizontalValid || isVerticalValid;
    }

    private isInBounds(board: IBoard, row: number, col: number): boolean {
        return row >= 0 && row < board.cells.length && col >= 0 && col < board.cells[0].length;
    }

    private isWall(board: IBoard, row: number, col: number): boolean {
        return this.isInBounds(board, row, col) && board.cells[row][col] === CellType.Wall;
    }

    private isTerrain(board: IBoard, row: number, col: number): boolean {
        if (!this.isInBounds(board, row, col)) return false;
        const cell = board.cells[row][col];
        return cell !== CellType.Wall && cell !== CellType.OpenDoor && cell !== CellType.ClosedDoor;
    }
}
