/**
 * Testing strategy — Game grid tooltip controller
 *
 * Approach:
 * - Verify hover/pointer state and tooltip text computation through dependency stubs.
 * - Validate fallback behavior when tooltip dependencies are unavailable.
 *
 * Edge cases covered:
 * - Missing tooltip factory and out-of-bounds cell coordinates.
 */
import { signal } from '@angular/core';
import { GameGridTooltipDependencies } from '@app/interfaces/game-grid-tooltip.interface';
import { GameGridTooltipController } from '@app/utils/game-grid-tooltip.controller';
import { CellType } from '@common/board';
import { IItem, ItemType } from '@common/items';

const OUT_OF_BOUNDS_INDEX = 8;

describe('GameGridTooltipController', () => {
    const cells = signal<CellType[][]>([[CellType.Empty, CellType.Water]]);
    const objects = signal<readonly IItem[] | null>([{ itemType: ItemType.Flag, x: 1, y: 0, size: 1, isCarried: false }]);

    function createDependencies(overrides: Partial<GameGridTooltipDependencies> = {}): GameGridTooltipDependencies {
        const getObjectAt = () => (row: number, col: number) => objects()?.find((item) => item.y === row && item.x === col) ?? null;
        return {
            cells,
            objects,
            getObjectAt,
            showTooltip: signal(true),
            getTooltipText: signal(
                (rowIndex: number, colIndex: number, cellType: CellType, item: IItem | null) =>
                    `${rowIndex},${colIndex}|${cellType}|${item?.itemType ?? 'none'}\nSecond line`,
            ),
            getGridContainer: () => null,
            getTooltipElement: () => null,
            ...overrides,
        };
    }

    it('shows, updates, and clears tooltip hover state', () => {
        // Nominal case
        const controller = new GameGridTooltipController(createDependencies());
        const enterEvent = new MouseEvent('mousemove', { clientX: 10, clientY: 12 });
        const moveEvent = new MouseEvent('mousemove', { clientX: 40, clientY: 44 });

        controller.showCellTooltip(enterEvent, 0, 1);
        expect(controller.hoveredCell()).toEqual({ rowIndex: 0, colIndex: 1 });
        expect(controller.tooltipPointer()).toEqual({ x: 10, y: 12 });

        controller.onCellMouseMove(moveEvent);
        expect(controller.tooltipPointer()).toEqual({ x: 40, y: 44 });

        controller.clearTooltip();
        expect(controller.hoveredCell()).toBeNull();
        expect(controller.tooltipPointer()).toBeNull();
    });

    it('computes tooltip text and tooltip lines from hovered cell', () => {
        // Nominal case
        const dependencies = createDependencies();
        const objectsSpy = spyOn(dependencies, 'objects').and.callThrough();
        const controller = new GameGridTooltipController(dependencies);

        controller.showCellTooltip(new MouseEvent('mousemove', { clientX: 20, clientY: 30 }), 0, 1);

        expect(controller.tooltipText()).toContain('0,1');
        expect(controller.tooltipText()).toContain(ItemType.Flag);
        expect(controller.tooltipLines()).toEqual([`0,1|${CellType.Water}|${ItemType.Flag}`, 'Second line']);
        expect(objectsSpy).toHaveBeenCalled();

        controller.syncTooltipPosition();
        expect(controller.tooltipPosition().x).toBeGreaterThan(0);
    });

    it('returns null tooltip when hidden, missing text factory, or out of bounds', () => {
        // Edge case
        const hiddenController = new GameGridTooltipController(createDependencies({ showTooltip: signal(false) }));
        hiddenController.showCellTooltip(new MouseEvent('mousemove', { clientX: 1, clientY: 1 }), 0, 0);
        expect(hiddenController.tooltipText()).toBeNull();

        const noFactoryController = new GameGridTooltipController(createDependencies({ getTooltipText: signal(null) }));
        noFactoryController.showCellTooltip(new MouseEvent('mousemove', { clientX: 1, clientY: 1 }), 0, 0);
        expect(noFactoryController.tooltipText()).toBeNull();

        const outOfBoundsController = new GameGridTooltipController(createDependencies());
        outOfBoundsController.showCellTooltip(new MouseEvent('mousemove', { clientX: 1, clientY: 1 }), OUT_OF_BOUNDS_INDEX, OUT_OF_BOUNDS_INDEX);
        expect(outOfBoundsController.tooltipText()).toBeNull();
    });

    it('ignores mouse move updates when no cell is hovered', () => {
        // Edge case
        const controller = new GameGridTooltipController(createDependencies());

        controller.onCellMouseMove(new MouseEvent('mousemove', { clientX: 99, clientY: 88 }));

        expect(controller.tooltipPointer()).toBeNull();
    });
});
/* Merged from game-grid-tooltip.controller.extra.spec.ts */

(() => {
    describe('GameGridTooltipController (extra)', () => {
        it('returns empty tooltip lines when tooltip text is null', () => {
            const cells = signal<CellType[][]>([[CellType.Empty]]);
            const objects = signal<readonly IItem[] | null>([{ itemType: ItemType.Flag, x: 0, y: 0, size: 1, isCarried: false }]);
            const dependencies: GameGridTooltipDependencies = {
                cells,
                objects,
                getObjectAt: () => () => null,
                showTooltip: signal(true),
                getTooltipText: signal((row, col, cellType) => `${row},${col}|${cellType}`),
                getGridContainer: () => null,
                getTooltipElement: () => null,
            };

            const controller = new GameGridTooltipController(dependencies);

            expect(controller.tooltipText()).toBeNull();
            expect(controller.tooltipLines()).toEqual([]);
        });
    });
})();
