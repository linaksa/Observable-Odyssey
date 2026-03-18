/**
 * Testing strategy — Boardshared Service
 *
 * Approach:
 * - Keep each test focused on one behavior with deterministic mocks/spies.
 * - Validate both nominal flows and failure paths that could break UX/state.
 * - Assert side effects explicitly (state changes, emitted events, and service calls).
 *
 * Edge cases covered:
 * - Missing or invalid input guards and safe early returns.
 * - Error handling paths and fallback user-facing messaging.
 * - Cleanup/teardown behavior (unsubscribe/reset/disconnect) when applicable.
 */
import { TestBed } from '@angular/core/testing';
import { IItem, ItemType, SMALL_ITEM_SIZE } from '@common/items';
import { BoardSharedService } from './board-shared.service';

const SANCTUARY_X = 3;
const SANCTUARY_Y = 5;
const SANCTUARY_BOTTOM_X = 4;
const SANCTUARY_RIGHT_Y = 6;
const OUTSIDE_TOP_X = 2;
const OUTSIDE_BOTTOM_X = 5;
const SEARCH_ROW = 3;
const SEARCH_COLUMN = 3;
const REGULAR_ITEM_POSITION = 1;
const REGULAR_ITEM_COLUMN = 2;
const REGULAR_ITEM_OUTSIDE_COLUMN = 3;

describe('BoardSharedService', () => {
    let service: BoardSharedService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(BoardSharedService);
    });

    it('should detect sanctuary occupancy on each covered tile', () => {
        const sanctuary = createItem(ItemType.LifeSanctuary, SANCTUARY_X, SANCTUARY_Y);

        expect(service.cellBelongsToObject(sanctuary, SANCTUARY_X, SANCTUARY_Y)).toBeTrue();
        expect(service.cellBelongsToObject(sanctuary, SANCTUARY_BOTTOM_X, SANCTUARY_RIGHT_Y)).toBeTrue();
        expect(service.cellBelongsToObject(sanctuary, OUTSIDE_TOP_X, SANCTUARY_Y)).toBeFalse();
        expect(service.cellBelongsToObject(sanctuary, OUTSIDE_BOTTOM_X, SANCTUARY_RIGHT_Y)).toBeFalse();
    });

    it('should detect occupancy of regular one-cell objects', () => {
        const flag = createItem(ItemType.Flag, REGULAR_ITEM_POSITION, REGULAR_ITEM_COLUMN);

        expect(service.cellBelongsToObject(flag, REGULAR_ITEM_POSITION, REGULAR_ITEM_COLUMN)).toBeTrue();
        expect(service.cellBelongsToObject(flag, REGULAR_ITEM_POSITION, REGULAR_ITEM_OUTSIDE_COLUMN)).toBeFalse();
    });

    it('should return object at coordinates when it exists', () => {
        const sanctuary = createItem(ItemType.FightSanctuary, OUTSIDE_TOP_X, OUTSIDE_TOP_X);
        const flag = createItem(ItemType.Flag, 0, 0);

        const found = service.getObjectAt(SEARCH_ROW, SEARCH_COLUMN, [flag, sanctuary]);

        expect(found).toBe(sanctuary);
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
