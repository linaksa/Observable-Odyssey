import { CellType, IBoard } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { ItemType } from '@common/items';
import { expect } from 'chai';
import { ReachabilityValidator } from './reachability-validator.service';

describe('ReachabilityValidator', () => {
    it('should treat sanctuaries as blocked cells for reachability validation', () => {
        const validator = new ReachabilityValidator();

        expect(validator.validate(createBridgeBoard(false))).to.deep.equal([]);
        expect(validator.validate(createBridgeBoard(true))).to.include(ErrorCode.BoardInaccessibleCells);
    });

    it('should ignore sanctuary-covered corner cells when choosing the flood-fill start', () => {
        const validator = new ReachabilityValidator();

        expect(validator.validate(createCornerSanctuaryBoard())).to.deep.equal([]);
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
