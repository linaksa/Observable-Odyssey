import { IBoard } from '@common/board';
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
    validate(board: IBoard): string[] {
        const errors: string[] = [];
        const gameSize = board.cells.length * board.cells[0].length;

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
