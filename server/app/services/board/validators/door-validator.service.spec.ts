/**
 * Testing strategy — DoorValidator
 *
 * Approach:
 * - Exercise the validator directly with synthetic boards that isolate each door-placement rule.
 * - Cover valid horizontal and vertical doors plus invalid edge and invalid neighbor layouts.
 *
 * Edge cases covered:
 * - Open and closed doors are both accepted when surrounded correctly.
 * - Edge doors fail because one or more neighbors are out of bounds.
 * - Interior doors fail when wall/terrain pairing is wrong.
 */
import { DoorValidator } from '@app/services/board/validators/door-validator.service';
import { CellType, IBoard } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { expect } from 'chai';

describe('DoorValidator', () => {
    // Nominal case: a horizontal open door is valid when walls and terrain are aligned.
    it('accepts a valid horizontal open door', () => {
        const validator = new DoorValidator();

        expect(validator.validate(createHorizontalDoorBoard(CellType.OpenDoor))).to.deep.equal([]);
    });

    // Nominal case: a vertical closed door is valid when walls and terrain are aligned.
    it('accepts a valid vertical closed door', () => {
        const validator = new DoorValidator();

        expect(validator.validate(createVerticalDoorBoard(CellType.ClosedDoor))).to.deep.equal([]);
    });

    // Edge case: doors placed on the board border should fail because a neighbor is out of bounds.
    it('rejects a door on the edge', () => {
        const validator = new DoorValidator();

        expect(validator.validate(createEdgeDoorBoard())).to.deep.equal([ErrorCode.BoardInvalidDoorPlacement]);
    });

    // Edge case: doors without the required wall/terrain pairing should be rejected.
    it('rejects a door with the wrong neighboring cells', () => {
        const validator = new DoorValidator();

        expect(validator.validate(createInvalidInteriorDoorBoard())).to.deep.equal([ErrorCode.BoardInvalidDoorPlacement]);
    });
});

function createHorizontalDoorBoard(doorType: CellType.OpenDoor | CellType.ClosedDoor): IBoard {
    return {
        cells: [
            [CellType.Empty, CellType.Empty, CellType.Empty],
            [CellType.Wall, doorType, CellType.Wall],
            [CellType.Empty, CellType.Empty, CellType.Empty],
        ],
        items: [],
    };
}

function createVerticalDoorBoard(doorType: CellType.OpenDoor | CellType.ClosedDoor): IBoard {
    return {
        cells: [
            [CellType.Empty, CellType.Wall, CellType.Empty],
            [CellType.Empty, doorType, CellType.Empty],
            [CellType.Empty, CellType.Wall, CellType.Empty],
        ],
        items: [],
    };
}

function createEdgeDoorBoard(): IBoard {
    return {
        cells: [
            [CellType.Empty, CellType.OpenDoor, CellType.Empty],
            [CellType.Wall, CellType.Empty, CellType.Wall],
            [CellType.Empty, CellType.Empty, CellType.Empty],
        ],
        items: [],
    };
}

function createInvalidInteriorDoorBoard(): IBoard {
    return {
        cells: [
            [CellType.Empty, CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.ClosedDoor, CellType.Empty],
            [CellType.Empty, CellType.Empty, CellType.Empty],
        ],
        items: [],
    };
}
