/**
 * Testing strategy — Game grid layout utilities
 *
 * Approach:
 * - Validate path/class/position helpers for cell, item, and preview rendering.
 * - Cover sanctuary-specific 2x2 sprite behavior and generic fallback behavior.
 *
 * Edge cases covered:
 * - Unsupported relative positions return empty background position.
 */
import {
    buildCellBackgroundClass,
    buildCellImagePath,
    buildItemBackgroundClass,
    buildItemBackgroundPosition,
    buildItemHeight,
    buildItemImagePath,
    buildItemLeft,
    buildItemTop,
    buildItemWidth,
    isInactiveSanctuary,
    isPreviewCell,
    isSanctuaryItemType,
    previewCellBackgroundClass,
    previewCellBackgroundPosition,
} from '@app/utils/game-grid-layout';
import { PlacementPreview } from '@app/interfaces/game-grid.interface';
import { CellType } from '@common/board';
import { IItem, ItemType } from '@common/items';

const THREE = 3;
const FOUR = 4;
const FIVE = 5;

describe('game-grid-layout utilities', () => {
    const sanctuary: IItem = { itemType: ItemType.LifeSanctuary, x: 2, y: THREE, size: FOUR, active: false };
    const regularItem: IItem = { itemType: ItemType.Flag, x: 2, y: 3, size: 1, isCarried: false };

    it('builds static image/class paths for cells and items', () => {
        // Nominal case
        expect(buildCellImagePath(CellType.Empty)).toBe('./assets/objects/grass.png');
        expect(buildCellBackgroundClass(CellType.Water)).toContain('water.png');
        expect(buildItemImagePath(regularItem)).toBe('./assets/objects/flag.png');
        expect(buildItemBackgroundClass(regularItem)).toContain('flag.png');
    });

    it('builds sanctuary-specific classes and dimensions', () => {
        // Nominal case
        expect(isInactiveSanctuary(sanctuary)).toBeTrue();
        expect(buildItemBackgroundClass(sanctuary)).toContain('opacity-50');
        expect(buildItemWidth(sanctuary)).toBe('200%');
        expect(buildItemHeight(sanctuary)).toBe('200%');
        expect(buildItemTop(sanctuary, sanctuary.y)).toBe('0');
        expect(buildItemTop(sanctuary, sanctuary.y + 1)).toBe('-100%');
        expect(buildItemLeft(sanctuary, sanctuary.x)).toBe('0');
        expect(buildItemLeft(sanctuary, sanctuary.x + 1)).toBe('-100%');
    });

    it('builds regular-item dimensions and offsets', () => {
        // Edge case
        expect(isInactiveSanctuary(regularItem)).toBeFalse();
        expect(buildItemWidth(regularItem)).toBe('100%');
        expect(buildItemHeight(regularItem)).toBe('100%');
        expect(buildItemTop(regularItem, 0)).toBe('0');
        expect(buildItemLeft(regularItem, 0)).toBe('0');
    });

    it('maps sanctuary sprite quadrants to background positions', () => {
        // Nominal case
        expect(buildItemBackgroundPosition(sanctuary, THREE, 2)).toBe('0% 0%');
        expect(buildItemBackgroundPosition(sanctuary, THREE, THREE)).toBe('100% 0%');
        expect(buildItemBackgroundPosition(sanctuary, FOUR, 2)).toBe('0% 100%');
        expect(buildItemBackgroundPosition(sanctuary, FOUR, THREE)).toBe('100% 100%');
        expect(buildItemBackgroundPosition(sanctuary, FIVE, FIVE)).toBe('');
        expect(buildItemBackgroundPosition(regularItem, THREE, 2)).toBe('');
    });

    it('detects preview cells for tile and item placement modes', () => {
        // Nominal case
        const tilePreview: PlacementPreview = { rowIndex: 1, colIndex: 1, cellType: CellType.Ice };
        const sanctuaryPreview: PlacementPreview = { rowIndex: 2, colIndex: 2, itemType: ItemType.FightSanctuary };
        const regularPreview: PlacementPreview = { rowIndex: 0, colIndex: 0, itemType: ItemType.Flag };

        expect(isPreviewCell(null, 0, 0)).toBeFalse();
        expect(isPreviewCell(tilePreview, 1, 1)).toBeTrue();
        expect(isPreviewCell(tilePreview, 1, 2)).toBeFalse();

        expect(isPreviewCell(sanctuaryPreview, 2, 2)).toBeTrue();
        expect(isPreviewCell(sanctuaryPreview, THREE, THREE)).toBeTrue();
        expect(isPreviewCell(sanctuaryPreview, FOUR, FOUR)).toBeFalse();

        expect(isPreviewCell(regularPreview, 0, 0)).toBeTrue();
        expect(isPreviewCell(regularPreview, 0, 1)).toBeFalse();
    });

    it('builds preview classes and positions for all preview types', () => {
        // Edge case
        const tilePreview: PlacementPreview = { rowIndex: 1, colIndex: 1, cellType: CellType.Ice };
        const sanctuaryPreview: PlacementPreview = { rowIndex: 2, colIndex: 2, itemType: ItemType.LifeSanctuary };
        const regularPreview: PlacementPreview = { rowIndex: 0, colIndex: 0, itemType: ItemType.Flag };
        const emptyPreview: PlacementPreview = { rowIndex: 0, colIndex: 0 };

        expect(previewCellBackgroundClass(null)).toBe('');
        expect(previewCellBackgroundClass(tilePreview)).toContain('opacity-50');
        expect(previewCellBackgroundClass(tilePreview)).toContain('ice.png');
        expect(previewCellBackgroundClass(regularPreview)).toContain('flag.png');
        expect(previewCellBackgroundClass(emptyPreview)).toBe('');

        expect(previewCellBackgroundPosition(null, 0, 0)).toBe('');
        expect(previewCellBackgroundPosition(regularPreview, 0, 0)).toBe('');
        expect(previewCellBackgroundPosition(sanctuaryPreview, 2, 2)).toBe('0% 0%');
        expect(previewCellBackgroundPosition(sanctuaryPreview, 2, THREE)).toBe('100% 0%');
        expect(previewCellBackgroundPosition(sanctuaryPreview, THREE, 2)).toBe('0% 100%');
        expect(previewCellBackgroundPosition(sanctuaryPreview, THREE, THREE)).toBe('100% 100%');
        expect(previewCellBackgroundPosition(sanctuaryPreview, FOUR, FOUR)).toBe('');
    });

    it('detects sanctuary item types', () => {
        // Nominal case
        expect(isSanctuaryItemType(ItemType.LifeSanctuary)).toBeTrue();
        expect(isSanctuaryItemType(ItemType.FightSanctuary)).toBeTrue();
        expect(isSanctuaryItemType(ItemType.Flag)).toBeFalse();
        expect(isSanctuaryItemType(ItemType.StartingPosition)).toBeFalse();
    });
});
