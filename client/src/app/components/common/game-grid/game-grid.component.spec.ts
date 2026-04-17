/* eslint-disable @typescript-eslint/no-magic-numbers -- To make the spec file easier to read */
/**
 * Testing strategy — Game Grid Component
 *
 * Approach:
 * - Validate computed rendering helpers from board/player/item inputs with deterministic fixtures.
 * - Exercise interaction outputs, tooltip lifecycle, and placement-preview resolution in isolation.
 *
 * Edge cases covered:
 * - Empty boards and non-portrait avatar mode keep helper outputs safe.
 * - Non-editable mode and missing hover state prevent unwanted emits or tooltip mutations.
 * - Sanctuary/item previews resolve correctly without leaking stale hover data.
 */
import { Component } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { GameGridComponent } from '@app/components/common/game-grid/game-grid.component';
import { GameGridCellEvent, PlacementPreview } from '@app/interfaces/game-grid.interface';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { IItem, ItemType } from '@common/items';

describe('GameGridComponent', () => {
    let fixture: ComponentFixture<GameGridComponent>;
    let component: GameGridComponent;
    let getObjectAtSpy: jasmine.Spy<(row: number, col: number) => IItem | null>;

    beforeEach(async () => {
        getObjectAtSpy = jasmine.createSpy<(row: number, col: number) => IItem | null>('getObjectAt').and.returnValue(null);

        const overrideInfo: MetadataOverride<Component> = {
            set: {
                template: '',
            },
        };
        TestBed.overrideComponent(GameGridComponent, overrideInfo);

        await TestBed.configureTestingModule({
            imports: [GameGridComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameGridComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('cells', [
            [CellType.Empty, CellType.Ice],
            [CellType.Water, CellType.Wall],
        ]);
        fixture.componentRef.setInput('getObjectAt', getObjectAtSpy);
        fixture.detectChanges();
    });

    it('computes grid/player rendering state and helper outputs from inputs', () => {
        // Nominal case: populated grid inputs derive expected rendering helpers and player grouping.
        const alice = createCharacter('Alice', 0, 0);
        const bob = createCharacter('Bob', 0, 0, true);
        const carol = createCharacter('Carol', 1, 1);

        fixture.componentRef.setInput('players', [alice, bob, carol]);
        fixture.componentRef.setInput('editable', true);
        fixture.componentRef.setInput('gridClass', 'rounded-lg');
        fixture.componentRef.setInput('highlightedTileClass', 'bg-test-highlight');
        fixture.componentRef.setInput('playerAvatarPortrait', true);
        fixture.detectChanges();

        const grid = component as unknown as {
            gridTemplateColumns: () => string;
            resolvedGridClass: () => string;
            resolvedCellClass: () => string;
            playersByCell: () => Map<string, ICharacter[]>;
            playerAvatarClass: () => string;
            highlightedTileOverlayClass: () => string;
            objectAt: (rowIndex: number, colIndex: number) => IItem | null;
            itemLeft: (item: IItem, rowIndex: number, colIndex: number) => string;
            playersAt: (rowIndex: number, colIndex: number) => ICharacter[];
            playerAvatarUrl: (player: ICharacter) => string;
        };

        expect(grid.gridTemplateColumns()).toBe('repeat(2, 1fr)');
        expect(grid.resolvedGridClass()).toContain('rounded-lg');
        expect(grid.resolvedCellClass()).toContain('cursor-crosshair');
        expect(grid.playerAvatarClass()).toContain('rounded-full');
        expect(grid.highlightedTileOverlayClass()).toContain('bg-test-highlight');

        const playersAtOrigin = grid.playersByCell().get('0:0') ?? [];
        expect(playersAtOrigin.length).toBe(1);
        expect(playersAtOrigin[0].name).toBe('Alice');
        expect(grid.playersAt(1, 1).map((gridPlayer) => gridPlayer.name)).toEqual(['Carol']);

        const item = createItem(ItemType.FightSanctuary, 0, 0);
        expect(grid.itemLeft(item, 0, 1)).toBe('-100%');
        expect(grid.playerAvatarUrl(alice)).toBe(buildAvatarAssetPath(alice.avatar, true));

        const fetchedObject = grid.objectAt(1, 0);
        expect(fetchedObject).toBeNull();
        expect(getObjectAtSpy).toHaveBeenCalledWith(1, 0);
    });

    it('handles empty boards and non-portrait avatar branch safely', () => {
        // Edge case: empty board and non-editable state should return fallback display values.
        fixture.componentRef.setInput('cells', []);
        fixture.componentRef.setInput('editable', false);
        fixture.componentRef.setInput('playerAvatarPortrait', false);
        fixture.detectChanges();

        const grid = component as unknown as {
            gridTemplateColumns: () => string;
            resolvedCellClass: () => string;
            playerAvatarClass: () => string;
            playersAt: (rowIndex: number, colIndex: number) => ICharacter[];
        };

        expect(grid.gridTemplateColumns()).toBe('repeat(1, 1fr)');
        expect(grid.resolvedCellClass()).not.toContain('cursor-crosshair');
        expect(grid.playerAvatarClass()).not.toContain('rounded-full');
        expect(grid.playersAt(0, 0)).toEqual([]);
    });

    it('emits interaction events and applies editable/tooltip guards', () => {
        fixture.componentRef.setInput('editable', false);
        fixture.detectChanges();

        const grid = component as unknown as {
            tooltipPointer: () => { x: number; y: number } | null;
            tooltipText: () => string | null;
            onCellMouseDown: (row: number, col: number, cellType: CellType, item: IItem | null, event: MouseEvent) => void;
            onCellMouseEnter: (row: number, col: number, cellType: CellType, item: IItem | null, event: MouseEvent) => void;
            onCellMouseMove: (event: MouseEvent) => void;
            onCellMouseLeave: () => void;
            onCellContextMenu: (row: number, col: number, cellType: CellType, item: IItem | null, event: MouseEvent) => void;
            onCellClick: (row: number, col: number, cellType: CellType, item: IItem | null, event: MouseEvent) => void;
            onPlayerClick: (player: ICharacter, event: MouseEvent) => void;
        };

        const mouseDownEvents: GameGridCellEvent[] = [];
        const mouseEnterEvents: GameGridCellEvent[] = [];
        const mouseLeaveEvents: number[] = [];
        const contextEvents: GameGridCellEvent[] = [];
        const clickEvents: GameGridCellEvent[] = [];
        const playerEvents: ICharacter[] = [];

        component.cellMouseDown.subscribe((event) => mouseDownEvents.push(event));
        component.cellMouseEnter.subscribe((event) => mouseEnterEvents.push(event));
        component.cellMouseLeave.subscribe(() => mouseLeaveEvents.push(1));
        component.cellContextMenu.subscribe((event) => contextEvents.push(event));
        component.cellClick.subscribe((event) => clickEvents.push(event));
        component.playerClicked.subscribe((clickedPlayer) => playerEvents.push(clickedPlayer));

        const blockedMouseDown = createMouseEventSpy();
        grid.onCellMouseDown(0, 0, CellType.Empty, null, blockedMouseDown as unknown as MouseEvent);
        expect(mouseDownEvents).toEqual([]);
        expect(blockedMouseDown.preventDefault).not.toHaveBeenCalled();

        const blockedMouseEnter = createPointerMouseEvent(5, 7);
        grid.onCellMouseEnter(0, 1, CellType.Ice, null, blockedMouseEnter);
        expect(mouseEnterEvents).toEqual([]);
        expect(grid.tooltipPointer()).toBeNull();

        fixture.componentRef.setInput('editable', true);
        fixture.componentRef.setInput('showTooltip', true);
        fixture.componentRef.setInput('getTooltipText', () => 'Cell info');
        fixture.detectChanges();

        const allowedMouseDown = createMouseEventSpy();
        grid.onCellMouseDown(1, 0, CellType.Water, null, allowedMouseDown as unknown as MouseEvent);
        expect(allowedMouseDown.preventDefault).toHaveBeenCalled();
        expect(mouseDownEvents.length).toBe(1);

        const enterEvent = createPointerMouseEvent(15, 20);
        grid.onCellMouseEnter(1, 1, CellType.Wall, null, enterEvent);
        expect(mouseEnterEvents.length).toBe(1);
        expect(grid.tooltipPointer()).toEqual({ x: 15, y: 20 });

        fixture.detectChanges();
        expect(grid.tooltipText()).toBe('Cell info');
        expect(getObjectAtSpy).toHaveBeenCalledWith(1, 1);

        const tooltipController = component['tooltipController'] as {
            syncTooltipPosition: () => void;
        };
        tooltipController.syncTooltipPosition();

        grid.onCellMouseMove(createPointerMouseEvent(22, 28));
        expect(grid.tooltipPointer()).toEqual({ x: 22, y: 28 });

        grid.onCellMouseLeave();
        expect(mouseLeaveEvents.length).toBe(1);
        expect(grid.tooltipPointer()).toBeNull();

        const contextMenuEvent = createMouseEventSpy();
        grid.onCellContextMenu(0, 1, CellType.Ice, null, contextMenuEvent as unknown as MouseEvent);
        expect(contextMenuEvent.preventDefault).toHaveBeenCalled();
        expect(contextMenuEvent.stopPropagation).toHaveBeenCalled();
        expect(contextEvents.length).toBe(1);

        const clickEvent = createPointerMouseEvent(0, 0);
        grid.onCellClick(0, 1, CellType.Ice, null, clickEvent);
        expect(clickEvents.length).toBe(1);

        const playerClickEvent = createMouseEventSpy();
        const player = createCharacter('Player', 0, 1);
        grid.onPlayerClick(player, playerClickEvent as unknown as MouseEvent);
        expect(playerClickEvent.stopPropagation).toHaveBeenCalled();
        expect(playerEvents).toEqual([player]);

        grid.onCellMouseMove(createPointerMouseEvent(30, 35));
        expect(grid.tooltipPointer()).toBeNull();
    });

    it('resolves preview overlays for cells and sanctuary items', () => {
        const grid = component as unknown as {
            isPreviewCell: (rowIndex: number, colIndex: number) => boolean;
            previewCellBackgroundClass: () => string;
            previewCellBackgroundPosition: (rowIndex: number, colIndex: number) => string;
        };

        const singleCellPreview: PlacementPreview = {
            rowIndex: 0,
            colIndex: 1,
            cellType: CellType.Ice,
        };
        fixture.componentRef.setInput('placementPreview', singleCellPreview);
        fixture.detectChanges();

        expect(grid.isPreviewCell(0, 1)).toBeTrue();
        expect(grid.isPreviewCell(1, 1)).toBeFalse();
        expect(grid.previewCellBackgroundClass()).toContain('bg-[url(./assets/objects/ice.png)]');
        expect(grid.previewCellBackgroundPosition(0, 1)).toBe('');

        const sanctuaryPreview: PlacementPreview = {
            rowIndex: 0,
            colIndex: 0,
            itemType: ItemType.FightSanctuary,
        };
        fixture.componentRef.setInput('placementPreview', sanctuaryPreview);
        fixture.detectChanges();

        expect(grid.isPreviewCell(0, 0)).toBeTrue();
        expect(grid.isPreviewCell(1, 1)).toBeTrue();
        expect(grid.previewCellBackgroundClass()).toContain('bg-size-[200%_200%]');
        expect(grid.previewCellBackgroundPosition(1, 1)).toBe('100% 100%');

        fixture.componentRef.setInput('placementPreview', null);
        fixture.detectChanges();

        expect(grid.isPreviewCell(0, 0)).toBeFalse();
        expect(grid.previewCellBackgroundClass()).toBe('');
    });
});

function createCharacter(name: string, x: number, y: number, hasAbandoned = false): ICharacter {
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
        hasAbandoned,
        startingPosition: { x, y },
        currentPosition: { x, y },
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}

function createItem(itemType: ItemType, x: number, y: number): IItem {
    return {
        itemType,
        x,
        y,
        size: itemType === ItemType.FightSanctuary || itemType === ItemType.LifeSanctuary ? 4 : 1,
        active: true,
    };
}

function createMouseEventSpy(): { preventDefault: jasmine.Spy; stopPropagation: jasmine.Spy } {
    return {
        preventDefault: jasmine.createSpy('preventDefault'),
        stopPropagation: jasmine.createSpy('stopPropagation'),
    };
}

function createPointerMouseEvent(clientX: number, clientY: number): MouseEvent {
    return { clientX, clientY } as MouseEvent;
}
