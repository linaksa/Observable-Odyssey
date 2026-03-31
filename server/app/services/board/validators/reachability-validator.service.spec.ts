import { CellType, IBoard } from '@common/board';
import { ItemType } from '@common/items';
import { expect } from 'chai';
import { ReachabilityValidator } from './reachability-validator.service';

describe('ReachabilityValidator', () => {
    it('should treat sanctuaries as blocked cells for reachability validation', () => {
        const validator = new ReachabilityValidator();

        expect(validator.validate(createBridgeBoard(false))).to.deep.equal([]);
        expect(validator.validate(createBridgeBoard(true))).to.include('Toutes les cellules de la carte ne sont pas accessibles.');
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
