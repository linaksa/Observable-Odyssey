/**
 * Testing strategy — ReachabilityValidator
 *
 * Approach:
 * - Validate flood-fill reachability outcomes with compact synthetic boards that isolate sanctuary behavior.
 *
 * Edge cases covered:
 * - Sanctuary footprints treated as blocked cells can split otherwise connected terrain.
 * - Corner sanctuary placement is ignored when selecting the flood-fill start tile.
 * - All-wall boards, empty boards with null items, and fully open boards cover the remaining traversal branches.
 */
import { CellType, IBoard } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { ItemType } from '@common/items';
import { expect } from 'chai';
import { ReachabilityValidator } from '@app/services/board/validators/reachability-validator.service';

describe('ReachabilityValidator', () => {
    // Nominal case: a normal board should stay reachable even when a sanctuary blocks an alternate path.
    it('should treat sanctuaries as blocked cells for reachability validation', () => {
        const validator = new ReachabilityValidator();

        expect(validator.validate(createBridgeBoard(false))).to.deep.equal([]);
        expect(validator.validate(createBridgeBoard(true))).to.include(ErrorCode.BoardInaccessibleCells);
    });

    // Nominal case: a corner sanctuary must not prevent the flood-fill from starting elsewhere.
    it('should ignore sanctuary-covered corner cells when choosing the flood-fill start', () => {
        const validator = new ReachabilityValidator();

        expect(validator.validate(createCornerSanctuaryBoard())).to.deep.equal([]);
    });

    // Edge case: a board with no traversable cells must be flagged as inaccessible.
    it('should reject a board made entirely of walls', () => {
        const validator = new ReachabilityValidator();

        expect(validator.validate(createAllWallsBoard())).to.include(ErrorCode.BoardInaccessibleCells);
    });

    // Edge case: a null entry in the items list should be ignored rather than crashing the scan.
    it('should ignore null items while scanning blocked cells', () => {
        const validator = new ReachabilityValidator();

        expect(validator.validate(createNullItemBoard())).to.deep.equal([]);
    });

    // Edge case: an undefined items list should be treated as empty.
    it('should ignore a missing items array while scanning blocked cells', () => {
        const validator = new ReachabilityValidator();

        expect(validator.validate(createUndefinedItemsBoard())).to.deep.equal([]);
    });
});

function createBridgeBoard(withSanctuary: boolean): IBoard {
    return {
        cells: [
            [CellType.Empty, CellType.Wall, CellType.Wall, CellType.Wall],
            [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Wall],
            [CellType.Wall, CellType.Empty, CellType.Empty, CellType.Empty],
            [CellType.Wall, CellType.Wall, CellType.Wall, CellType.Empty],
        ],
        items: withSanctuary
            ? [
                  {
                      itemType: ItemType.LifeSanctuary,
                      x: 1,
                      y: 1,
                      size: 4,
                      active: true,
                  },
              ]
            : [],
    };
}

function createCornerSanctuaryBoard(): IBoard {
    return {
        cells: [
            [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty],
        ],
        items: [
            {
                itemType: ItemType.LifeSanctuary,
                x: 0,
                y: 0,
                size: 4,
                active: true,
            },
        ],
    };
}

function createAllWallsBoard(): IBoard {
    return {
        cells: [
            [CellType.Wall, CellType.Wall],
            [CellType.Wall, CellType.Wall],
        ],
        items: [],
    };
}

function createNullItemBoard(): IBoard {
    return {
        cells: [
            [CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.Empty],
        ],
        items: [null as never],
    };
}

function createUndefinedItemsBoard(): IBoard {
    return {
        cells: [
            [CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.Empty],
        ],
        items: undefined as never,
    };
}
