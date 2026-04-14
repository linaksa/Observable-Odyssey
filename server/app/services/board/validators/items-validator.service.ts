import { IBoard } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { GameSize } from '@common/constants';
import { ItemType } from '@common/items';
import { Service } from 'typedi';
import { IBoardValidator } from './board-validator.interface';

enum ExpectedSanctuaries {
    Small = 1,
    Mid = 2,
    Large = 4,
}

enum ExpectedStartingPoints {
    Small = 2,
    Mid = 4,
    Large = 6,
}

interface ExpectedCounts {
    expectedStartingPoints: number;
    expectedLifeSanctuaries: number;
    expectedFightSanctuaries: number;
}

@Service()
export class ItemsValidator implements IBoardValidator {
    validate(board: IBoard): ErrorCode[] {
        const errors: ErrorCode[] = [];
        const gameSize = board.cells.length * board.cells[0].length;

        const expectedCounts = this.getExpectedCounts(gameSize);
        if (!expectedCounts) {
            errors.push(ErrorCode.BoardInvalidSize);
            return errors;
        }

        let startingPointCount = 0;

        for (const item of board.items ?? []) {
            if (item.itemType === ItemType.StartingPosition) {
                startingPointCount++;
            }
        }

        if (startingPointCount !== expectedCounts.expectedStartingPoints) {
            errors.push(ErrorCode.BoardInvalidSpawnCount);
        }

        return errors;
    }

    private getExpectedCounts(gameSize: number): ExpectedCounts | null {
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
}
