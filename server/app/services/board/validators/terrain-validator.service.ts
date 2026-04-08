import { EXPECTED_TERRAIN_USE } from '@app/constants/terrain-validator';
import { CellType, IBoard } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { Service } from 'typedi';
import { IBoardValidator } from './board-validator.interface';

@Service()
export class TerrainValidator implements IBoardValidator {
    validate(board: IBoard): ErrorCode[] {
        const errors: ErrorCode[] = [];
        const gameSize = board.cells.length * board.cells[0].length;

        let occupiedCells = 0;
        for (const row of board.cells) {
            for (const cell of row) {
                if (cell !== CellType.ClosedDoor && cell !== CellType.OpenDoor && cell !== CellType.Wall) {
                    occupiedCells++;
                }
            }
        }

        if (occupiedCells <= gameSize * EXPECTED_TERRAIN_USE) {
            errors.push(ErrorCode.BoardLowTerrainCoverage);
        }

        return errors;
    }
}
