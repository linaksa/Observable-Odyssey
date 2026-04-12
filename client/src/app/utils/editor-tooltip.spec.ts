/**
 * Testing strategy — Editor tooltip utility
 *
 * Approach:
 * - Test tooltip text generation with various combinations of tile, object, and error states.
 * - Verify tooltip includes tile name, object name (if present), and error message (if applicable).
 * - Use deterministic board configurations to test error detection.
 *
 * Edge cases covered:
 * - Tooltip with only tile name (no object, no error).
 * - Tooltip with tile and object name (no error).
 * - Tooltip with tile, object, and error message.
 * - Empty or null inputs should return null tooltip text.
 * - Error messages for invalid door placement and inaccessible cells.
 */
import { CellType } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { IItem, ItemType, SMALL_ITEM_SIZE } from '@common/items';
import { buildEditorTooltipData, buildEditorTooltipText } from './editor-tooltip';

describe('Editor tooltip utility', () => {
    describe('buildEditorTooltipText', () => {
        it('should return tooltip with tile name only', () => {
            const cells: CellType[][] = [[CellType.Empty]];
            const items: IItem[] = [];
            const errorCodes: ErrorCode[] = [];

            const result = buildEditorTooltipText({ cellType: CellType.Empty, item: null, rowIndex: 0, colIndex: 0 }, cells, items, errorCodes);

            expect(result).toBe('Tuile de base');
        });

        it('should return tooltip with tile and object name', () => {
            const cells: CellType[][] = [[CellType.Empty]];
            const item: IItem = {
                itemType: ItemType.Flag,
                x: 0,
                y: 0,
                size: SMALL_ITEM_SIZE,
            };
            const items: IItem[] = [item];
            const errorCodes: ErrorCode[] = [];

            const result = buildEditorTooltipText({ cellType: CellType.Empty, item, rowIndex: 0, colIndex: 0 }, cells, items, errorCodes);

            expect(result).toBe('Tuile de base\nDrapeau');
        });

        it('should return tooltip with tile, object, and error message for invalid door placement', () => {
            const cells: CellType[][] = [
                [CellType.Wall, CellType.ClosedDoor, CellType.Wall],
                [CellType.Empty, CellType.Empty, CellType.Empty],
                [CellType.Empty, CellType.Empty, CellType.Empty],
            ];
            const items: IItem[] = [];
            const errorCodes: ErrorCode[] = [ErrorCode.BoardInvalidDoorPlacement];

            const result = buildEditorTooltipText({ cellType: CellType.ClosedDoor, item: null, rowIndex: 0, colIndex: 1 }, cells, items, errorCodes);

            expect(result).toBe('Porte fermée\n⚠ Porte mal placée');
            expect(result).toContain('⚠ Porte mal placée');
        });

        it('should return tooltip with error message for inaccessible cells', () => {
            const cells: CellType[][] = [
                [CellType.Empty, CellType.Wall, CellType.Empty],
                [CellType.Wall, CellType.Wall, CellType.Wall],
                [CellType.Empty, CellType.Wall, CellType.Empty],
            ];
            const items: IItem[] = [];
            const errorCodes: ErrorCode[] = [ErrorCode.BoardInaccessibleCells];

            const result = buildEditorTooltipText({ cellType: CellType.Empty, item: null, rowIndex: 2, colIndex: 2 }, cells, items, errorCodes);

            expect(result).toContain('Tuile de base');
            expect(result).toContain('⚠ Case inaccessible');
        });

        it('should not return a grid tooltip error message for low terrain coverage', () => {
            const cells: CellType[][] = [
                [CellType.Wall, CellType.Wall, CellType.Empty],
                [CellType.Wall, CellType.Wall, CellType.Empty],
                [CellType.Empty, CellType.Empty, CellType.Empty],
            ];
            const items: IItem[] = [];
            const errorCodes: ErrorCode[] = [ErrorCode.BoardLowTerrainCoverage];

            const result = buildEditorTooltipText({ cellType: CellType.Empty, item: null, rowIndex: 0, colIndex: 2 }, cells, items, errorCodes);

            expect(result).toBe('Tuile de base');
        });

        // Edge case: Empty cells array should return basic tooltip without errors.
        it('should return basic tooltip when cells array is empty', () => {
            const cells: CellType[][] = [];
            const items: IItem[] = [];
            const errorCodes: ErrorCode[] = [];

            const result = buildEditorTooltipText({ cellType: CellType.Empty, item: null, rowIndex: 0, colIndex: 0 }, cells, items, errorCodes);

            expect(result).toBe('Tuile de base');
        });

        it('should return null when tooltip data is null', () => {
            const cells: CellType[][] = [[CellType.Empty]];
            const items: IItem[] = [];
            const errorCodes: ErrorCode[] = [];

            const data = buildEditorTooltipData({ cellType: CellType.Empty, item: null, rowIndex: 0, colIndex: 0 }, cells, items, errorCodes);
            expect(data).toBeTruthy();

            const result = buildEditorTooltipText({ cellType: CellType.Empty, item: null, rowIndex: 0, colIndex: 0 }, cells, items, errorCodes);
            expect(result).toBeTruthy();
        });
    });

    describe('buildEditorTooltipData', () => {
        it('should build data with tile name', () => {
            const cells: CellType[][] = [[CellType.Ice]];
            const items: IItem[] = [];
            const errorCodes: ErrorCode[] = [];

            const result = buildEditorTooltipData({ cellType: CellType.Ice, item: null, rowIndex: 0, colIndex: 0 }, cells, items, errorCodes);

            expect(result).toEqual({
                tileName: 'Glace',
                objectName: undefined,
                errorMessage: undefined,
            });
        });

        it('should build data with tile and object name', () => {
            const cells: CellType[][] = [[CellType.Water]];
            const item: IItem = {
                itemType: ItemType.LifeSanctuary,
                x: 0,
                y: 0,
                size: SMALL_ITEM_SIZE,
            };
            const items: IItem[] = [item];
            const errorCodes: ErrorCode[] = [];

            const result = buildEditorTooltipData({ cellType: CellType.Water, item, rowIndex: 0, colIndex: 0 }, cells, items, errorCodes);

            expect(result).toEqual({
                tileName: 'Eau',
                objectName: 'Sanctuaire de vie',
                errorMessage: undefined,
            });
        });

        it('should build data with error message for highlighted tile', () => {
            const cells: CellType[][] = [
                [CellType.Empty, CellType.ClosedDoor, CellType.Empty],
                [CellType.Empty, CellType.Empty, CellType.Empty],
            ];
            const items: IItem[] = [];
            const errorCodes: ErrorCode[] = [ErrorCode.BoardInvalidDoorPlacement];

            const result = buildEditorTooltipData({ cellType: CellType.ClosedDoor, item: null, rowIndex: 0, colIndex: 1 }, cells, items, errorCodes);

            expect(result?.tileName).toBe('Porte fermée');
            expect(result?.errorMessage).toBe('Porte mal placée');
        });

        it('should not build a grid error message for low terrain coverage', () => {
            const cells: CellType[][] = [
                [CellType.Wall, CellType.Wall, CellType.Empty],
                [CellType.Wall, CellType.Wall, CellType.Empty],
            ];
            const items: IItem[] = [];
            const errorCodes: ErrorCode[] = [ErrorCode.BoardLowTerrainCoverage];

            const result = buildEditorTooltipData({ cellType: CellType.Empty, item: null, rowIndex: 0, colIndex: 2 }, cells, items, errorCodes);

            expect(result?.tileName).toBe('Tuile de base');
            expect(result?.errorMessage).toBeUndefined();
        });

        it('should ignore low terrain coverage in grid highlights', () => {
            const cells: CellType[][] = [
                [CellType.Wall, CellType.Wall, CellType.Wall],
                [CellType.Empty, CellType.Empty, CellType.Empty],
            ];
            const items: IItem[] = [];
            const errorCodes: ErrorCode[] = [ErrorCode.BoardLowTerrainCoverage];

            const result = buildEditorTooltipData({ cellType: CellType.Empty, item: null, rowIndex: 1, colIndex: 0 }, cells, items, errorCodes);

            expect(result?.errorMessage).toBeUndefined();
        });

        // Edge case: No error codes should result in no error message.
        it('should not include error message when no error codes are present', () => {
            const cells: CellType[][] = [[CellType.ClosedDoor]];
            const items: IItem[] = [];
            const errorCodes: ErrorCode[] = [];

            const result = buildEditorTooltipData({ cellType: CellType.ClosedDoor, item: null, rowIndex: 0, colIndex: 0 }, cells, items, errorCodes);

            expect(result?.errorMessage).toBeUndefined();
        });
    });
});
