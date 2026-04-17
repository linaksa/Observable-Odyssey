/**
 * Testing strategy — ItemsValidator
 *
 * Approach:
 * - Validate the service directly with synthetic square boards sized to each supported game size.
 * - Cover the expected-count branches plus invalid size and spawn-count mismatch failures.
 *
 * Edge cases covered:
 * - Small, mid, and large boards each use different spawn-count expectations.
 * - Unsupported sizes fail fast with `BoardInvalidSize`.
 * - Spawn-count mismatches fail independently from size validation.
 */
import { ItemsValidator } from '@app/services/board/validators/items-validator.service';
import { CellType, IBoard } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { ItemType } from '@common/items';
import { expect } from 'chai';

describe('ItemsValidator', () => {
    // Nominal case: a small board with the expected spawn count should validate cleanly.
    it('accepts a valid small board', () => {
        const validator = new ItemsValidator();

        expect(validator.validate(createBoard(SMALL_BOARD_SIZE, SMALL_STARTING_POINTS))).to.deep.equal([]);
    });

    // Nominal case: a mid board with the expected spawn count should validate cleanly.
    it('accepts a valid mid board', () => {
        const validator = new ItemsValidator();

        expect(validator.validate(createBoard(MID_BOARD_SIZE, MID_STARTING_POINTS))).to.deep.equal([]);
    });

    // Nominal case: a large board with the expected spawn count should validate cleanly.
    it('accepts a valid large board', () => {
        const validator = new ItemsValidator();

        expect(validator.validate(createBoard(LARGE_BOARD_SIZE, LARGE_STARTING_POINTS))).to.deep.equal([]);
    });

    // Edge case: unsupported board dimensions must fail before spawn counting.
    it('rejects unsupported board sizes', () => {
        const validator = new ItemsValidator();

        expect(validator.validate(createBoard(INVALID_BOARD_SIZE, 0))).to.deep.equal([ErrorCode.BoardInvalidSize]);
    });

    // Edge case: a supported board with too few spawn points must report the spawn-count error.
    it('rejects spawn-count mismatches', () => {
        const validator = new ItemsValidator();

        expect(validator.validate(createBoard(SMALL_BOARD_SIZE, MISSING_STARTING_POINTS))).to.deep.equal([ErrorCode.BoardInvalidSpawnCount]);
    });

    // Edge case: a missing items array should be treated the same as an empty list.
    it('rejects a missing items array as a spawn-count mismatch', () => {
        const validator = new ItemsValidator();
        const board = createBoard(SMALL_BOARD_SIZE, SMALL_STARTING_POINTS) as IBoard & { items?: never[] };
        board.items = undefined;

        expect(validator.validate(board)).to.deep.equal([ErrorCode.BoardInvalidSpawnCount]);
    });
});

const SMALL_BOARD_SIZE = 10;
const MID_BOARD_SIZE = 15;
const LARGE_BOARD_SIZE = 20;
const INVALID_BOARD_SIZE = 3;
const SMALL_STARTING_POINTS = 2;
const MID_STARTING_POINTS = 4;
const LARGE_STARTING_POINTS = 6;
const MISSING_STARTING_POINTS = 1;

function createBoard(size: number, startingPointCount: number): IBoard {
    return {
        cells: Array.from({ length: size }, () => Array.from({ length: size }, () => CellType.Empty)),
        items: Array.from({ length: startingPointCount }, (_, index) => ({
            x: index,
            y: 0,
            size: 1,
            itemType: ItemType.StartingPosition,
        })),
    };
}
