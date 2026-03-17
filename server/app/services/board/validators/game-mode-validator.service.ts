import { IBoard } from '@common/board';
import { GameType } from '@common/game';
import { ItemType } from '@common/items';
import { Service } from 'typedi';

@Service()
export class GameModeValidator {
    validate(board: IBoard, gameMode: GameType): string[] {
        const errors: string[] = [];

        if (gameMode === GameType.Ctf) {
            const flagCount = board.items.filter((item) => item.itemType === ItemType.Flag).length;

            if (flagCount === 0) {
                errors.push('En mode Capture The Flag, un drapeau doit être placé sur la carte.');
            }
        }

        return errors;
    }
}
