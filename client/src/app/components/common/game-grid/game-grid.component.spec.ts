/**
 * Testing strategy — GameGridComponent
 *
 * Approach:
 * - Render the shared grid with a deterministic board and item lookup.
 * - Verify the component draws the expected tile and item sprites.
 * - Verify edit-mode output events are emitted only when the grid is editable.
 *
 * Edge cases covered:
 * - Sanctuary items should span 2x2 cells with shifted offsets.
 * - Read-only mode should not emit edit events.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CELL_TYPE_BACKGROUNDS, CELL_TYPE_PATHS, ITEM_TYPE_PATHS, OBJECT_IMAGES, OBJECT_SPECIFIC_CLASSES } from '@app/constants/backgrounds-mapping';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { IItem, ItemType, SMALL_ITEM_SIZE } from '@common/items';
import { GameGridCellEvent, GameGridComponent } from './game-grid.component';

describe('GameGridComponent', () => {
    let fixture: ComponentFixture<GameGridComponent>;
    let component: GameGridComponent;

    const cells: CellType[][] = [
        [CellType.Empty, CellType.Water],
        [CellType.Ice, CellType.Wall],
    ];
    const expectedCellImageCount = cells.length * cells[0].length;

    const flag: IItem = {
        itemType: ItemType.Flag,
        x: 0,
        y: 1,
        size: SMALL_ITEM_SIZE,
    };

    const sanctuary: IItem = {
        itemType: ItemType.LifeSanctuary,
        x: 0,
        y: 0,
        size: SMALL_ITEM_SIZE,
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameGridComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameGridComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('cells', cells);
        fixture.componentRef.setInput('editable', true);
        fixture.componentRef.setInput('gridClass', 'rounded-lg');
        fixture.componentRef.setInput('getObjectAt', (rowIndex: number, colIndex: number) => {
            if (rowIndex === 0 && colIndex === 1) {
                return flag;
            }

            if (rowIndex < 2 && colIndex < 2) {
                return sanctuary;
            }

            return null;
        });
        fixture.detectChanges();
    });

    it('should render cells and object sprites', () => {
        const grid = fixture.nativeElement.querySelector('[data-testid="game-grid"]') as HTMLElement;
        const cellImages = fixture.nativeElement.querySelectorAll('[data-testid="game-grid-cell-image"]');
        const objectImages = fixture.nativeElement.querySelectorAll('[data-testid="game-grid-item"]');

        expect(component).toBeTruthy();
        expect(grid.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
        expect(cellImages.length).toBe(expectedCellImageCount);
        expect(cellImages[0].getAttribute('src')).toContain(CELL_TYPE_PATHS[CellType.Empty]);
        expect(cellImages[1].getAttribute('src')).toContain(CELL_TYPE_PATHS[CellType.Water]);
        expect(cellImages[0].className).toContain('[image-rendering:pixelated]');
        expect(objectImages.length).toBeGreaterThan(0);
        expect(objectImages[0].getAttribute('src')).toContain(ITEM_TYPE_PATHS[ItemType.LifeSanctuary]);
        expect(objectImages[0].className).toContain('[image-rendering:pixelated]');
    });

    it('should emit mouse events when editable', () => {
        const mouseDownSpy = jasmine.createSpy('mouseDown');
        const mouseEnterSpy = jasmine.createSpy('mouseEnter');
        component.cellMouseDown.subscribe(mouseDownSpy);
        component.cellMouseEnter.subscribe(mouseEnterSpy);

        const cell = fixture.nativeElement.querySelector('[data-testid="game-grid-cell"]') as HTMLElement;
        cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));
        cell.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

        expect(mouseDownSpy).toHaveBeenCalled();
        expect(mouseEnterSpy).toHaveBeenCalled();

        const emittedEvent = mouseDownSpy.calls.mostRecent().args[0] as GameGridCellEvent;
        expect(emittedEvent.rowIndex).toBe(0);
        expect(emittedEvent.colIndex).toBe(0);
        expect(emittedEvent.cellType).toBe(CellType.Empty);
    });

    it('should keep sanctuary items anchored to the top-left cell', () => {
        const sanctuaryItem = fixture.nativeElement.querySelectorAll('[data-testid="game-grid-item"]')[0] as HTMLElement;

        expect(sanctuaryItem.style.top).toBe('0px');
        expect(sanctuaryItem.style.left).toBe('0px');
        expect(sanctuaryItem.style.width).toBe('200%');
        expect(sanctuaryItem.style.height).toBe('200%');
    });

    it('should not emit edit events when read-only', () => {
        fixture.componentRef.setInput('editable', false);
        fixture.detectChanges();

        const mouseDownSpy = jasmine.createSpy('mouseDown');
        component.cellMouseDown.subscribe(mouseDownSpy);

        const cell = fixture.nativeElement.querySelector('[data-testid="game-grid-cell"]') as HTMLElement;
        cell.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, button: 0 }));

        expect(mouseDownSpy).not.toHaveBeenCalled();
    });

    it('should emit context menu events', () => {
        const contextMenuSpy = jasmine.createSpy('contextMenu');
        component.cellContextMenu.subscribe(contextMenuSpy);

        const cell = fixture.nativeElement.querySelector('[data-testid="game-grid-cell"]') as HTMLElement;
        cell.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));

        expect(contextMenuSpy).toHaveBeenCalled();
        const emittedEvent = contextMenuSpy.calls.mostRecent().args[0] as GameGridCellEvent;
        expect(emittedEvent.rowIndex).toBe(0);
        expect(emittedEvent.colIndex).toBe(0);
        expect(emittedEvent.cellType).toBe(CellType.Empty);
    });

    it('should render players when provided and emit player clicks', () => {
        const player = createCharacter('Alice');
        const clickSpy = jasmine.createSpy('playerClick');
        component.playerClicked.subscribe(clickSpy);

        fixture.componentRef.setInput('players', [player]);
        fixture.detectChanges();

        const playerButton = fixture.nativeElement.querySelector('[data-testid="game-grid-player"]') as HTMLButtonElement;

        expect(playerButton).toBeTruthy();
        expect(playerButton.style.backgroundImage).toContain('assets/characters/archer-portrait.png');
        expect(playerButton.className).toContain('[image-rendering:pixelated]');

        playerButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

        expect(clickSpy).toHaveBeenCalledWith(player);
    });

    it('should render full-tile players when portrait mode is disabled', () => {
        fixture.componentRef.setInput('playerAvatarPortrait', false);
        fixture.componentRef.setInput('players', [createCharacter('Alice')]);
        fixture.detectChanges();

        const playerButton = fixture.nativeElement.querySelector('[data-testid="game-grid-player"]') as HTMLButtonElement;

        expect(playerButton).toBeTruthy();
        expect(playerButton.style.backgroundImage).toContain('assets/characters/archer.png');
        expect(playerButton.className).not.toContain('rounded-full');
        expect(playerButton.className).not.toContain('m-1');
    });

    it('should render background mode with css classes', () => {
        fixture.componentRef.setInput('useBackgroundRendering', true);
        fixture.componentRef.setInput('highlightedTiles', new Set([0]));
        fixture.detectChanges();

        const cellImages = fixture.nativeElement.querySelectorAll('[data-testid="game-grid-cell-image"]');
        const cellBackground = fixture.nativeElement.querySelector('[data-testid="game-grid-cell-background"]') as HTMLElement;
        const itemBackground = fixture.nativeElement.querySelector('[data-testid="game-grid-item"]') as HTMLElement;
        const highlight = fixture.nativeElement.querySelector('[data-testid="game-grid-highlight"]') as HTMLElement;

        expect(cellImages.length).toBe(0);
        expect(cellBackground.className).toContain(CELL_TYPE_BACKGROUNDS[CellType.Empty]);
        expect(itemBackground.className).toContain(OBJECT_IMAGES[ItemType.LifeSanctuary]);
        expect(itemBackground.className).toContain(OBJECT_SPECIFIC_CLASSES[ItemType.LifeSanctuary]);
        expect(itemBackground.style.backgroundPosition).toBe('0% 0%');
        expect(cellBackground.className).toContain('[image-rendering:pixelated]');
        expect(itemBackground.className).toContain('[image-rendering:pixelated]');
        expect(highlight.className).toContain('bg-blue-600/30');
        expect(highlight.className).toContain('z-20');
        expect(highlight.previousElementSibling).toBe(itemBackground);
    });
});

function createCharacter(name: string): ICharacter {
    return {
        name,
        avatar: Avatar.Avatar1,
        initialHealth: 10,
        currentHealth: 10,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints: 4,
        attackPoints: 4,
        defensePoints: 4,
        actionsLeft: 1,
        movementLeft: 4,
        victories: 0,
        hasAbandoned: false,
        positionDepart: { x: 0, y: 0 },
        positionGrille: { x: 1, y: 0 },
    };
}
