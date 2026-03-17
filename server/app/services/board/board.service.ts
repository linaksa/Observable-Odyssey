import { IBoard } from '@common/board';
import { GameType } from '@common/game';
import { Service } from 'typedi';
import { DoorValidator } from './validators/door-validator.service';
import { GameModeValidator } from './validators/game-mode-validator.service';
import { ItemsValidator } from './validators/items-validator.service';
import { ReachabilityValidator } from './validators/reachability-validator.service';
import { TerrainValidator } from './validators/terrain-validator.service';

@Service()
export class BoardService {
    constructor(
        private readonly terrainValidator: TerrainValidator,
        private readonly doorValidator: DoorValidator,
        private readonly itemsValidator: ItemsValidator,
        private readonly reachabilityValidator: ReachabilityValidator,
        private readonly gameModeValidator: GameModeValidator,
    ) {}

    validateBoard(board: IBoard, gameMode: GameType): string[] {
        const errors: string[] = [];

        errors.push(...this.doorValidator.validate(board));
        errors.push(...this.terrainValidator.validate(board));
        errors.push(...this.itemsValidator.validate(board));
        errors.push(...this.reachabilityValidator.validate(board));
        errors.push(...this.gameModeValidator.validate(board, gameMode));

        return errors;
    }
}
