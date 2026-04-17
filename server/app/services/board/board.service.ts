import { IBoard } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { GameType } from '@common/game';
import { Service } from 'typedi';
import { DoorValidator } from '@app/services/board/validators/door-validator.service';
import { GameModeValidator } from '@app/services/board/validators/game-mode-validator.service';
import { ItemsValidator } from '@app/services/board/validators/items-validator.service';
import { ReachabilityValidator } from '@app/services/board/validators/reachability-validator.service';
import { TerrainValidator } from '@app/services/board/validators/terrain-validator.service';

@Service()
export class BoardService {
    constructor(
        private readonly terrainValidator: TerrainValidator,
        private readonly doorValidator: DoorValidator,
        private readonly itemsValidator: ItemsValidator,
        private readonly reachabilityValidator: ReachabilityValidator,
        private readonly gameModeValidator: GameModeValidator,
    ) {}

    validateBoard(board: IBoard, gameMode: GameType): ErrorCode[] {
        const errors: ErrorCode[] = [];

        errors.push(...this.doorValidator.validate(board));
        errors.push(...this.terrainValidator.validate(board));
        errors.push(...this.itemsValidator.validate(board));
        errors.push(...this.reachabilityValidator.validate(board));
        errors.push(...this.gameModeValidator.validate(board, gameMode));

        return errors;
    }
}
