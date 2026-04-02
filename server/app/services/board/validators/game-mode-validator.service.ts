import { IBoard } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { GameType } from '@common/game';
import { ItemType } from '@common/items';
import { Service } from 'typedi';

@Service()
export class GameModeValidator {
    validate(board: IBoard, gameMode: GameType): ErrorCode[] {
        const errors: ErrorCode[] = [];

        if (gameMode === GameType.Ctf) {
            const flagCount = board.items.filter((item) => item.itemType === ItemType.Flag).length;

            if (flagCount === 0) {
                errors.push(ErrorCode.BoardMissingFlag);
            }
        }

        return errors;
    }
}
