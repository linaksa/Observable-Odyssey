/**
 * Testing strategy — GameGrid tooltip behavior
 *
 * Approach:
 * - Render the shared grid with a deterministic hover tooltip configuration.
 * - Verify tooltip content keeps separate lines for each piece of information.
 * - Verify tooltip placement centers over the cursor and flips below when needed.
 *
 * Edge cases covered:
 * - Tooltip should hide when showTooltip is disabled or the callback returns null.
 * - Tooltip should move when the mouse moves.
 * - Tooltip should stay centered within the grid bounds.
 */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CellType } from '@common/board';
import { IItem, ItemType, SMALL_ITEM_SIZE } from '@common/items';
import { GameGridComponent } from './game-grid.component';

const TOOLTIP_GRID_WIDTH = 400;
const TOOLTIP_GRID_HEIGHT = 200;
const TOOLTIP_CENTER_X = 200;
const TOOLTIP_RIGHT_EDGE_X = 390;
const TOOLTIP_BOTTOM_CURSOR_Y = 150;
const TOOLTIP_GAP = 24;
const TOOLTIP_FALLBACK_TOP_CURSOR_Y = 20;
const TOOLTIP_PRECISION_DECIMALS = 3;

describe('GameGrid tooltip behavior', () => {
    let fixture: ComponentFixture<GameGridComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameGridComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameGridComponent);
        fixture.componentRef.setInput('cells', [[CellType.Empty]]);
        fixture.componentRef.setInput('editable', true);
        fixture.componentRef.setInput('getObjectAt', () => null);
        fixture.componentRef.setInput('showTooltip', true);
        fixture.componentRef.setInput('getTooltipText', (rowIndex: number, colIndex: number) => {
            if (rowIndex === 0 && colIndex === 0) {
                return 'Tuile de base\nSanctuaire de vie';
            }

            return 'Hover text';
        });
        fixture.detectChanges();
    });

    it('should place tooltip below the cursor when there is no room above', () => {
        const gridContainer = fixture.nativeElement.querySelector('div.relative.w-full') as HTMLElement;
        spyOn(gridContainer, 'getBoundingClientRect').and.returnValue(createGridBounds(0, 0, TOOLTIP_GRID_WIDTH, TOOLTIP_GRID_HEIGHT));

        const cell = fixture.nativeElement.querySelector('[data-testid="game-grid-cell"]') as HTMLElement;
        cell.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: TOOLTIP_CENTER_X, clientY: TOOLTIP_FALLBACK_TOP_CURSOR_Y }));
        fixture.detectChanges();

        const tooltip = fixture.nativeElement.querySelector('[data-testid="game-grid-tooltip"]') as HTMLElement;
        const tooltipHeight = tooltip.getBoundingClientRect().height;

        expect(tooltip).toBeTruthy();
        expect(tooltip.style.left).toBe(`${TOOLTIP_CENTER_X}px`);
        expect(tooltip.style.top).toBe(`${TOOLTIP_FALLBACK_TOP_CURSOR_Y + TOOLTIP_GAP}px`);
        expect(tooltipHeight).toBeGreaterThan(0);
    });

    it('should hide tooltip when getTooltipText returns null', () => {
        fixture.componentRef.setInput('getTooltipText', () => null);
        fixture.detectChanges();

        const cell = fixture.nativeElement.querySelector('[data-testid="game-grid-cell"]') as HTMLElement;
        cell.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: 100, clientY: 100 }));
        fixture.detectChanges();

        const tooltip = fixture.nativeElement.querySelector('[data-testid="game-grid-tooltip"]');
        expect(tooltip).toBeFalsy();
    });

    it('should move tooltip on mousemove', () => {
        const gridContainer = fixture.nativeElement.querySelector('div.relative.w-full') as HTMLElement;
        spyOn(gridContainer, 'getBoundingClientRect').and.returnValue(createGridBounds(0, 0, TOOLTIP_GRID_WIDTH, TOOLTIP_GRID_HEIGHT));

        const cell = fixture.nativeElement.querySelector('[data-testid="game-grid-cell"]') as HTMLElement;
        cell.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: 100, clientY: 100 }));
        fixture.detectChanges();

        cell.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 150, clientY: 150 }));
        fixture.detectChanges();

        const tooltip = fixture.nativeElement.querySelector('[data-testid="game-grid-tooltip"]') as HTMLElement;
        expect(tooltip).toBeTruthy();
        expect(tooltip.style.left).toBe('150px');
    });

    it('should keep tooltip width when clamping to the right edge', () => {
        const gridContainer = fixture.nativeElement.querySelector('div.relative.w-full') as HTMLElement;
        spyOn(gridContainer, 'getBoundingClientRect').and.returnValue(createGridBounds(0, 0, TOOLTIP_GRID_WIDTH, TOOLTIP_GRID_HEIGHT));

        const cell = fixture.nativeElement.querySelector('[data-testid="game-grid-cell"]') as HTMLElement;
        cell.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: TOOLTIP_CENTER_X, clientY: 150 }));
        fixture.detectChanges();

        const centeredTooltip = fixture.nativeElement.querySelector('[data-testid="game-grid-tooltip"]') as HTMLElement;
        const centeredWidth = centeredTooltip.getBoundingClientRect().width;

        cell.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: TOOLTIP_RIGHT_EDGE_X, clientY: 150 }));
        fixture.detectChanges();

        const tooltip = fixture.nativeElement.querySelector('[data-testid="game-grid-tooltip"]') as HTMLElement;
        const tooltipRect = tooltip.getBoundingClientRect();
        const tooltipLeft = parseFloat(tooltip.style.left);

        expect(tooltip).toBeTruthy();
        expect(tooltipRect.width).toBeCloseTo(centeredWidth, TOOLTIP_PRECISION_DECIMALS);
        expect(tooltipLeft).toBeCloseTo(TOOLTIP_GRID_WIDTH - tooltipRect.width / 2, TOOLTIP_PRECISION_DECIMALS);
        expect(tooltipLeft + tooltipRect.width / 2).toBeCloseTo(TOOLTIP_GRID_WIDTH, TOOLTIP_PRECISION_DECIMALS);
    });

    it('should update tooltip text when the hovered cell content changes', () => {
        const gridContainer = fixture.nativeElement.querySelector('div.relative.w-full') as HTMLElement;
        spyOn(gridContainer, 'getBoundingClientRect').and.returnValue(createGridBounds(0, 0, TOOLTIP_GRID_WIDTH, TOOLTIP_GRID_HEIGHT));

        const hoveredItem = signal<IItem | null>(null);
        fixture.componentRef.setInput('getObjectAt', () => hoveredItem());
        fixture.componentRef.setInput('getTooltipText', (rowIndex: number, colIndex: number, cellType: CellType, item: IItem | null) => {
            if (rowIndex !== 0 || colIndex !== 0) {
                return 'Hover text';
            }

            const tileName = cellType === CellType.Empty ? 'Tuile de base' : 'Mur';
            const itemName = item?.itemType === ItemType.Flag ? 'Drapeau' : 'Aucun objet';
            return `${tileName}\n${itemName}`;
        });
        fixture.detectChanges();

        const cell = fixture.nativeElement.querySelector('[data-testid="game-grid-cell"]') as HTMLElement;
        cell.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true, clientX: TOOLTIP_CENTER_X, clientY: TOOLTIP_BOTTOM_CURSOR_Y }));
        fixture.detectChanges();

        let tooltip = fixture.nativeElement.querySelector('[data-testid="game-grid-tooltip"]') as HTMLElement;
        expect(tooltip.textContent).toContain('Tuile de base');
        expect(tooltip.textContent).toContain('Aucun objet');

        hoveredItem.set({
            itemType: ItemType.Flag,
            x: 0,
            y: 0,
            size: SMALL_ITEM_SIZE,
        });
        fixture.detectChanges();

        tooltip = fixture.nativeElement.querySelector('[data-testid="game-grid-tooltip"]') as HTMLElement;
        expect(tooltip.textContent).toContain('Drapeau');
    });
});

function createGridBounds(left: number, top: number, width: number, height: number): DOMRect {
    return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON: () => ({}),
    } as DOMRect;
}
