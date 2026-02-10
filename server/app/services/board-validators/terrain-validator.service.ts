import { CellType, IBoard } from '@common/board';
import { Service } from 'typedi';
import { IBoardValidator } from './board-validator.interface';

const EXPECTED_TERRAIN_USE = 0.5;

@Service()
export class TerrainValidator implements IBoardValidator {
    validate(board: IBoard): string[] {
        const errors: string[] = [];
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
            errors.push('Moins de 50% de la surface totale de la carte est couverte par des tuiles.');
        }

        return errors;
    }
}
