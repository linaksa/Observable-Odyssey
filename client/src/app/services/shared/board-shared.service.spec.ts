/**
 * Testing strategy — BoardSharedService
 *
 * Approach:
 * - Build board/item fixtures to exercise occupancy, adjacency, and lookup helpers directly.
 * - Validate behavior for multi-cell sanctuaries, single-cell objects, and carried inventory items.
 *
 * Edge cases covered:
 * - Carried items are excluded from tile occupancy checks.
 * - Coordinate misses return null/false without throwing.
 */
import { TestBed } from '@angular/core/testing';
import { IItem, ItemType, SMALL_ITEM_SIZE } from '@common/items';
import { BoardSharedService } from '@app/services/shared/board-shared.service';

const SANCTUARY_COLUMN = 3;
const SANCTUARY_ROW = 5;
const SANCTUARY_RIGHT_COLUMN = 4;
const SANCTUARY_BOTTOM_ROW = 6;
const OUTSIDE_TOP_ROW = 4;
const OUTSIDE_BOTTOM_ROW = 7;
const SEARCH_ROW = 3;
const SEARCH_COLUMN = 3;
const REGULAR_ITEM_ROW = 1;
const REGULAR_ITEM_COLUMN = 2;
const REGULAR_ITEM_OUTSIDE_COLUMN = 3;

describe('BoardSharedService', () => {
    let service: BoardSharedService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(BoardSharedService);
    });

    it('should detect sanctuary occupancy on each covered tile', () => {
        const sanctuary = createItem(ItemType.LifeSanctuary, SANCTUARY_COLUMN, SANCTUARY_ROW);

        expect(service.cellBelongsToObject(sanctuary, SANCTUARY_ROW, SANCTUARY_COLUMN)).toBeTrue();
        expect(service.cellBelongsToObject(sanctuary, SANCTUARY_BOTTOM_ROW, SANCTUARY_RIGHT_COLUMN)).toBeTrue();
        expect(service.cellBelongsToObject(sanctuary, OUTSIDE_TOP_ROW, SANCTUARY_COLUMN)).toBeFalse();
        expect(service.cellBelongsToObject(sanctuary, OUTSIDE_BOTTOM_ROW, SANCTUARY_RIGHT_COLUMN)).toBeFalse();
    });

    it('should detect occupancy of regular one-cell objects', () => {
        const flag = createItem(ItemType.Flag, REGULAR_ITEM_COLUMN, REGULAR_ITEM_ROW);

        expect(service.cellBelongsToObject(flag, REGULAR_ITEM_ROW, REGULAR_ITEM_COLUMN)).toBeTrue();
        expect(service.cellBelongsToObject(flag, REGULAR_ITEM_ROW, REGULAR_ITEM_OUTSIDE_COLUMN)).toBeFalse();
    });

    it('should detect adjacency to sanctuary and regular items', () => {
        const sanctuary = createItem(ItemType.FightSanctuary, SANCTUARY_COLUMN, SANCTUARY_ROW);
        const flag = createItem(ItemType.Flag, REGULAR_ITEM_COLUMN, REGULAR_ITEM_ROW);

        expect(service.isAdjacentToObject(sanctuary, SANCTUARY_ROW, SANCTUARY_COLUMN - 1)).toBeTrue();
        expect(service.isAdjacentToObject(sanctuary, SANCTUARY_BOTTOM_ROW + 1, SANCTUARY_COLUMN)).toBeTrue();
        expect(service.isAdjacentToObject(sanctuary, SANCTUARY_ROW, SANCTUARY_COLUMN)).toBeFalse();
        expect(service.isAdjacentToObject(flag, REGULAR_ITEM_ROW, REGULAR_ITEM_COLUMN + 1)).toBeTrue();
        expect(service.isAdjacentToObject(flag, REGULAR_ITEM_ROW + 1, REGULAR_ITEM_COLUMN + 1)).toBeFalse();
    });

    it('should return object at coordinates when it exists', () => {
        const sanctuary = createItem(ItemType.FightSanctuary, SEARCH_COLUMN - 1, SEARCH_ROW - 1);
        const flag = createItem(ItemType.Flag, 0, 0);

        const found = service.getObjectAt(SEARCH_ROW, SEARCH_COLUMN, [flag, sanctuary]);

        expect(found).toEqual(sanctuary);
    });

    // Edge case: When no object occupies the coordinates, return null.
    it('should return null when no object occupies the coordinates', () => {
        const flag = createItem(ItemType.Flag, 0, 0);

        const found = service.getObjectAt(SEARCH_ROW, SEARCH_COLUMN, [flag]);

        expect(found).toBeNull();
    });
});

function createItem(itemType: ItemType, x: number, y: number): IItem {
    return {
        itemType,
        x,
        y,
        size: SMALL_ITEM_SIZE,
    };
}
/* Merged from board-shared.service.extra.spec.ts */

(() => {
    const ITEM_COLUMN = 2;
    const ITEM_ROW = 4;

    describe('BoardSharedService (extra)', () => {
        let service: BoardSharedService;

        beforeEach(() => {
            TestBed.configureTestingModule({});
            service = TestBed.inject(BoardSharedService);
        });

        it('returns false for carried items even when coordinates match', () => {
            const carriedFlag: IItem = {
                itemType: ItemType.Flag,
                x: ITEM_COLUMN,
                y: ITEM_ROW,
                size: SMALL_ITEM_SIZE,
                isCarried: true,
            };

            expect(service.cellBelongsToObject(carriedFlag, ITEM_ROW, ITEM_COLUMN)).toBeFalse();
        });
    });
})();
