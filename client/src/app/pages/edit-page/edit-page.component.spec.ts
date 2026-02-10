/* eslint-disable max-lines */

import { signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { AbstractControl, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { BoardEditorService, GridSize, ToolOption } from '@app/services/edition.service';
import { GameEditFormService } from '@app/services/game-edit-form.service';
import { GameService } from '@app/services/game.service';
import { CellType } from '@common/board';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { IItem, ItemType } from '@common/items';
import { of, Subject } from 'rxjs';
import { EditPageComponent } from './edit-page.component';
import SpyObj = jasmine.SpyObj;

interface MouseInteractionStateTest {
    isDrawing: boolean;
    isShiftPressed: boolean;
    lastIndexes: [number, number];
}

describe('EditPageComponent', () => {
    const LEFT_BUTTON = 0;
    const RIGHT_BUTTON = 2;
    const PRIMARY_BUTTON_MASK = 1;
    const SECONDARY_BUTTON_MASK = 2;

    const START_ROW = 0;
    const START_COL = 0;

    const RIGHT_CLICK_ROW = 3;
    const RIGHT_CLICK_COL = 4;

    const OBJECT_ROW = 2;
    const OBJECT_COL = 3;

    const DOOR_ROW = 0;
    const DOOR_COL = 1;

    const PLACEMENT_ROW = 1;
    const PLACEMENT_COL = 1;

    const DRAG_ROW = 2;
    const DRAG_COL = 2;

    const ENTER_ROW = 4;
    const ENTER_COL = 5;

    const EDGE_ROW = 99;
    const EDGE_COL = 99;

    const ITEM_BASE_COUNT = 3;
    const ITEM_CTF_COUNT = 4;

    const PERCENT_TOP_LEFT = '0% 0%';
    const PERCENT_TOP_RIGHT = '100% 0%';
    const PERCENT_BOTTOM_LEFT = '0% 100%';
    const PERCENT_BOTTOM_RIGHT = '100% 100%';

    let component: EditPageComponent;
    let fixture: ComponentFixture<EditPageComponent>;
    let gameServiceSpy: SpyObj<GameService>;
    let boardEditorServiceSpy: SpyObj<BoardEditorService>;
    let gameEditFormServiceSpy: SpyObj<GameEditFormService>;
    let routerSpy: SpyObj<Router>;
    let paramsSubject: Subject<{ gameId: string }>;

    const mockGame: IExistingGame = {
        _id: 'test-game-id',
        gameTitle: 'Test Game',
        description: 'Test Description',
        gameMode: GameType.Classic,
        lastModifiedDate: new Date(),
        dateCreated: new Date(),
        visibility: Visibility.Viewable,
        preview: 'data:image/png;base64,test',
        board: {
            cells: Array.from({ length: GridSize.SMALL }, () => Array(GridSize.SMALL).fill(CellType.Grass)),
            items: [],
        },
    };

    const mockFormGroup: FormGroup = new FormBuilder().group({
        gameTitle: [''],
        description: [''],
        gameMode: [GameType.Classic],
    });

    beforeEach(async () => {
        paramsSubject = new Subject<{ gameId: string }>();

        gameServiceSpy = jasmine.createSpyObj<GameService>('GameService', ['getGameById']);
        Object.defineProperty(gameServiceSpy, 'gameUnderCreation', {
            value: undefined,
            writable: true,
            configurable: true,
        });

        gameServiceSpy.getGameById.and.returnValue(of(mockGame));

        boardEditorServiceSpy = jasmine.createSpyObj('BoardEditorService', [
            'buildGrid',
            'initFromExistingBoard',
            'applyTile',
            'applyObject',
            'eraseTile',
            'eraseObject',
            'changeGameMode',
            'getObjectCount',
            'revertGrid',
            'setGrid',
        ]);
        boardEditorServiceSpy.activeTool = ToolOption.Placement;
        boardEditorServiceSpy.selectedMaterial = CellType.Grass;
        boardEditorServiceSpy.selectedObject = null;
        boardEditorServiceSpy.gameCells = mockGame.board.cells;
        boardEditorServiceSpy.objects = mockGame.board.items;
        boardEditorServiceSpy.gameMode = GameType.Classic;
        boardEditorServiceSpy.availableTools = [ToolOption.Placement, ToolOption.Objects];

        gameEditFormServiceSpy = jasmine.createSpyObj('GameEditFormService', ['init', 'submitForm'], {
            isSubmitting: signal(false),
            form: mockFormGroup,
        });

        routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [EditPageComponent],
            providers: [
                { provide: GameService, useValue: gameServiceSpy },
                { provide: BoardEditorService, useValue: boardEditorServiceSpy },
                { provide: GameEditFormService, useValue: gameEditFormServiceSpy },
                { provide: Router, useValue: routerSpy },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        params: paramsSubject,
                    },
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EditPageComponent);
        component = fixture.componentInstance;

        expect(TestBed.inject(ActivatedRoute).params).toBe(paramsSubject);
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('ngOnInit', () => {
        it('should handle new game creation without gameUnderCreation', fakeAsync(() => {
            component.ngOnInit();
            paramsSubject.next({ gameId: 'new' });
            tick();

            expect(component.newGame).toBe(true);
            expect(component.editedGame?._id).toBe('');
            expect(component.editedGame?.gameMode).toBe(GameType.Classic);
            expect(boardEditorServiceSpy.buildGrid).toHaveBeenCalled();
            expect(gameEditFormServiceSpy.init).toHaveBeenCalled();
        }));

        it('should handle new game creation with gameUnderCreation', fakeAsync(() => {
            const mockGameCopy = { ...mockGame };
            gameServiceSpy.gameUnderCreation = mockGameCopy;

            component.ngOnInit();
            paramsSubject.next({ gameId: 'new' });
            tick();

            expect(component.newGame).toBe(true);
            expect(component.editedGame).toEqual(mockGameCopy);
            expect(boardEditorServiceSpy.buildGrid).toHaveBeenCalled();
            expect(gameEditFormServiceSpy.init).toHaveBeenCalledWith(mockGameCopy);
        }));

        it('should load existing game by ID', fakeAsync(() => {
            component.ngOnInit();
            paramsSubject.next({ gameId: 'test-game-id' });
            tick();

            expect(component.newGame).toBe(false);
            expect(gameServiceSpy.getGameById).toHaveBeenCalledWith('test-game-id');
            expect(component.editedGame).toEqual(mockGame);
            expect(boardEditorServiceSpy.buildGrid).toHaveBeenCalled();
            expect(gameEditFormServiceSpy.init).toHaveBeenCalled();
        }));

        it('should disable gameMode form control', fakeAsync(() => {
            const gameModeControl = mockFormGroup.get('gameMode');
            expect(gameModeControl).withContext('Expected gameMode control to exist').not.toBeNull();

            const disableSpy = spyOn(gameModeControl as AbstractControl, 'disable');

            component.ngOnInit();
            paramsSubject.next({ gameId: 'new' });
            tick();

            expect(disableSpy).toHaveBeenCalledWith({ emitEvent: false });
        }));

        it('should initialize editor with correct grid size', fakeAsync(() => {
            component.ngOnInit();
            paramsSubject.next({ gameId: 'test-game-id' });
            tick();

            expect(boardEditorServiceSpy.buildGrid).toHaveBeenCalledWith(GridSize.SMALL);
        }));
    });

    describe('gameModeChange', () => {
        let mockEvent: { target: { value: GameType } };
        let selectElement: { value: GameType };

        beforeEach(() => {
            selectElement = {
                value: GameType.Classic,
            };
            mockEvent = {
                target: selectElement,
            };
        });

        it('should change game mode to Classic', () => {
            selectElement.value = GameType.Classic;
            boardEditorServiceSpy.getObjectCount.and.returnValue(0);

            component.gameModeChange(mockEvent as unknown as Event);

            expect(boardEditorServiceSpy.changeGameMode).toHaveBeenCalledWith(GameType.Classic);
        });

        it('should change game mode to Ctf', () => {
            selectElement.value = GameType.Ctf;
            boardEditorServiceSpy.getObjectCount.and.returnValue(0);

            component.gameModeChange(mockEvent as unknown as Event);

            expect(boardEditorServiceSpy.changeGameMode).toHaveBeenCalledWith(GameType.Ctf);
        });

        it('should prompt confirmation when changing from Ctf with flag present and user confirms', () => {
            selectElement.value = GameType.Classic;
            boardEditorServiceSpy.getObjectCount.and.returnValue(1);
            boardEditorServiceSpy.gameMode = GameType.Ctf;
            spyOn(window, 'confirm').and.returnValue(true);

            component.gameModeChange(mockEvent as unknown as Event);

            expect(window.confirm).toHaveBeenCalled();
            expect(boardEditorServiceSpy.changeGameMode).toHaveBeenCalledWith(GameType.Classic);
        });

        it('should not change mode when user cancels confirmation', () => {
            selectElement.value = GameType.Classic;
            boardEditorServiceSpy.getObjectCount.and.returnValue(1);
            boardEditorServiceSpy.gameMode = GameType.Ctf;
            spyOn(window, 'confirm').and.returnValue(false);

            component.gameModeChange(mockEvent as unknown as Event);

            expect(window.confirm).toHaveBeenCalled();
            expect(boardEditorServiceSpy.changeGameMode).toHaveBeenCalledWith(GameType.Ctf);
            expect(selectElement.value).toBe(GameType.Ctf);
        });
    });

    describe('selectTool / selectMaterial / selectObject', () => {
        it('should select placement tool', () => {
            component.selectTool(ToolOption.Placement);
            expect(boardEditorServiceSpy.activeTool).toBe(ToolOption.Placement);
        });

        it('should select objects tool', () => {
            component.selectTool(ToolOption.Objects);
            expect(boardEditorServiceSpy.activeTool).toBe(ToolOption.Objects);
        });

        it('should select materials', () => {
            component.selectMaterial(CellType.Wall);
            expect(boardEditorServiceSpy.selectedMaterial).toBe(CellType.Wall);
        });

        it('should select objects', () => {
            component.selectObject(ItemType.Flag);
            expect(boardEditorServiceSpy.selectedObject).toBe(ItemType.Flag);
        });
    });

    describe('onMouseDown', () => {
        let mouseEvent: MouseEvent;

        beforeEach(() => {
            mouseEvent = new MouseEvent('mousedown', { button: LEFT_BUTTON });
        });

        it('should set drawing state and last indexes', () => {
            const mouseStateAccessor = component as unknown as { mouseState: MouseInteractionStateTest };
            component.onMouseDown(START_ROW, START_COL, mouseEvent);
            expect(mouseStateAccessor.mouseState.isDrawing).toBe(true);
            expect(mouseStateAccessor.mouseState.lastIndexes).toEqual([START_ROW, START_COL]);
        });

        it('should erase tile on right click without shift', () => {
            const rightClickEvent = new MouseEvent('mousedown', { button: RIGHT_BUTTON });
            const mouseStateAccessor = component as unknown as { mouseState: MouseInteractionStateTest };
            mouseStateAccessor.mouseState.isShiftPressed = false;

            component.onMouseDown(RIGHT_CLICK_ROW, RIGHT_CLICK_COL, rightClickEvent);

            expect(boardEditorServiceSpy.eraseTile).toHaveBeenCalledWith(RIGHT_CLICK_ROW, RIGHT_CLICK_COL);
            expect(boardEditorServiceSpy.eraseObject).not.toHaveBeenCalled();
        });

        it('should erase object on right click with shift', () => {
            const rightClickEvent = new MouseEvent('mousedown', { button: RIGHT_BUTTON });
            const mouseStateAccessor = component as unknown as { mouseState: MouseInteractionStateTest };
            mouseStateAccessor.mouseState.isShiftPressed = true;

            component.onMouseDown(RIGHT_CLICK_ROW, RIGHT_CLICK_COL, rightClickEvent);

            expect(boardEditorServiceSpy.eraseObject).toHaveBeenCalledWith(RIGHT_CLICK_ROW, RIGHT_CLICK_COL);
            expect(boardEditorServiceSpy.eraseTile).not.toHaveBeenCalled();
        });

        it('should apply object when Objects tool is active', () => {
            boardEditorServiceSpy.activeTool = ToolOption.Objects;

            component.onMouseDown(OBJECT_ROW, OBJECT_COL, mouseEvent);

            expect(boardEditorServiceSpy.applyObject).toHaveBeenCalledWith(OBJECT_ROW, OBJECT_COL);
        });

        it('should toggle door when OpenDoor material selected', () => {
            boardEditorServiceSpy.activeTool = ToolOption.Placement;
            boardEditorServiceSpy.selectedMaterial = CellType.OpenDoor;
            boardEditorServiceSpy.gameCells = [[CellType.Grass, CellType.OpenDoor]];

            component.onMouseDown(DOOR_ROW, DOOR_COL, mouseEvent);

            expect(boardEditorServiceSpy.gameCells[DOOR_ROW][DOOR_COL]).toBe(CellType.ClosedDoor);
        });

        it('should apply tile when Placement tool active and not OpenDoor', () => {
            boardEditorServiceSpy.activeTool = ToolOption.Placement;
            boardEditorServiceSpy.selectedMaterial = CellType.Grass;

            component.onMouseDown(PLACEMENT_ROW, PLACEMENT_COL, mouseEvent);

            expect(boardEditorServiceSpy.applyTile).toHaveBeenCalledWith(PLACEMENT_ROW, PLACEMENT_COL);
        });
    });

    describe('onMouseEnter', () => {
        let mouseEvent: MouseEvent;

        beforeEach(() => {
            mouseEvent = new MouseEvent('mouseenter', { buttons: PRIMARY_BUTTON_MASK });
            const mouseStateAccessor = component as unknown as { mouseState: MouseInteractionStateTest };
            mouseStateAccessor.mouseState.isDrawing = true;
            mouseStateAccessor.mouseState.lastIndexes = [START_ROW, START_COL];
        });

        it('should do nothing when not drawing', () => {
            const mouseStateAccessor = component as unknown as { mouseState: MouseInteractionStateTest };
            mouseStateAccessor.mouseState.isDrawing = false;

            component.onMouseEnter(PLACEMENT_ROW, PLACEMENT_COL, mouseEvent);

            expect(boardEditorServiceSpy.applyTile).not.toHaveBeenCalled();
        });

        it('should do nothing when same cell as lastIndexes', () => {
            const mouseStateAccessor = component as unknown as { mouseState: MouseInteractionStateTest };
            mouseStateAccessor.mouseState.lastIndexes = [EDGE_ROW, EDGE_COL];

            component.onMouseEnter(EDGE_ROW, EDGE_COL, mouseEvent);

            expect(boardEditorServiceSpy.applyTile).not.toHaveBeenCalled();
        });

        it('should update lastIndexes when different cell', () => {
            const mouseStateAccessor = component as unknown as { mouseState: MouseInteractionStateTest };
            component.onMouseEnter(ENTER_ROW, ENTER_COL, mouseEvent);
            expect(mouseStateAccessor.mouseState.lastIndexes).toEqual([ENTER_ROW, ENTER_COL]);
        });

        it('should erase tile on right button drag without shift', () => {
            const rightDragEvent = new MouseEvent('mouseenter', { buttons: SECONDARY_BUTTON_MASK });
            const mouseStateAccessor = component as unknown as { mouseState: MouseInteractionStateTest };
            mouseStateAccessor.mouseState.isShiftPressed = false;

            component.onMouseEnter(DRAG_ROW, DRAG_COL, rightDragEvent);

            expect(boardEditorServiceSpy.eraseTile).toHaveBeenCalledWith(DRAG_ROW, DRAG_COL);
        });

        it('should erase object on right button drag with shift', () => {
            const rightDragEvent = new MouseEvent('mouseenter', { buttons: SECONDARY_BUTTON_MASK });
            const mouseStateAccessor = component as unknown as { mouseState: MouseInteractionStateTest };
            mouseStateAccessor.mouseState.isShiftPressed = true;

            component.onMouseEnter(DRAG_ROW, DRAG_COL, rightDragEvent);

            expect(boardEditorServiceSpy.eraseObject).toHaveBeenCalledWith(DRAG_ROW, DRAG_COL);
        });

        it('should apply tile when Placement tool active', () => {
            boardEditorServiceSpy.activeTool = ToolOption.Placement;

            component.onMouseEnter(ENTER_ROW, ENTER_COL, mouseEvent);

            expect(boardEditorServiceSpy.applyTile).toHaveBeenCalledWith(ENTER_ROW, ENTER_COL);
        });

        it('should not apply tile when Objects tool active', () => {
            boardEditorServiceSpy.activeTool = ToolOption.Objects;

            component.onMouseEnter(ENTER_ROW, ENTER_COL, mouseEvent);

            expect(boardEditorServiceSpy.applyTile).not.toHaveBeenCalled();
        });
    });

    describe('stopDrawing and shift handlers', () => {
        it('should set isDrawing to false', () => {
            const mouseStateAccessor = component as unknown as { mouseState: MouseInteractionStateTest };
            mouseStateAccessor.mouseState.isDrawing = true;
            component.stopDrawing();
            expect(mouseStateAccessor.mouseState.isDrawing).toBe(false);
        });

        it('should set shift flags', () => {
            const mouseStateAccessor = component as unknown as { mouseState: MouseInteractionStateTest };
            mouseStateAccessor.mouseState.isShiftPressed = false;
            component.onShiftDown();
            expect(mouseStateAccessor.mouseState.isShiftPressed).toBe(true);
            component.onShiftUp();
            expect(mouseStateAccessor.mouseState.isShiftPressed).toBe(false);
        });
    });

    describe('availableItemsTypes', () => {
        it('should return base items for Classic mode', () => {
            boardEditorServiceSpy.gameMode = GameType.Classic;

            const items = component.availableItemsTypes;
            expect(items).toContain(ItemType.LifeSanctuary);
            expect(items).toContain(ItemType.FightSanctuary);
            expect(items).toContain(ItemType.StartingPosition);
            expect(items).not.toContain(ItemType.Flag);
            expect(items.length).toBe(ITEM_BASE_COUNT);
        });

        it('should return items with Flag for Ctf mode', () => {
            boardEditorServiceSpy.gameMode = GameType.Ctf;

            const items = component.availableItemsTypes;
            expect(items).toContain(ItemType.Flag);
            expect(items.length).toBe(ITEM_CTF_COUNT);
        });
    });

    describe('setGridSize', () => {
        it('should call setGrid and blur the element', fakeAsync(() => {
            const mockElement = document.createElement('div');
            spyOn(mockElement, 'blur');
            component.grid = { nativeElement: mockElement };

            const gridSize = 15;
            component.setGridSize(gridSize);
            tick();

            expect(boardEditorServiceSpy.setGrid).toHaveBeenCalledWith(gridSize);
            expect(mockElement.blur).toHaveBeenCalled();
        }));

        it('should handle missing grid element gracefully', fakeAsync(() => {
            component.grid = undefined;

            const gridSize = 10;
            component.setGridSize(gridSize);
            tick();

            expect(boardEditorServiceSpy.setGrid).toHaveBeenCalledWith(gridSize);
        }));
    });

    describe('background helpers', () => {
        const SANCTUARY_X = 5;
        const SANCTUARY_Y = 5;
        const SANCTUARY_SIZE = 4;
        const SINGLE_ITEM_SIZE = 1;
        const ORIGIN_X = 0;
        const ORIGIN_Y = 0;
        const OFFSET_ONE = 1;

        it('cellImagePath returns a value', () => {
            expect(component.cellImagePath(CellType.Grass)).toBeDefined();
        });

        it('objectImagePath returns a value', () => {
            expect(component.objectImagePath(ItemType.Flag)).toBeDefined();
        });

        it('backgroundImageForObject returns empty string when null', () => {
            expect(component.backgroundImageForObject(null)).toBe('');
        });

        it('backgroundImageForObject returns value for an item', () => {
            const item: IItem = { x: ORIGIN_X, y: ORIGIN_Y, size: SINGLE_ITEM_SIZE, itemType: ItemType.Flag };
            expect(component.backgroundImageForObject(item)).toBeDefined();
        });

        it('getSanctuaryBgPosition handles quadrants and outside area', () => {
            const sanctuaryAccessor = component as unknown as {
                getSanctuaryBgPosition: (row: number, col: number, item: IItem) => string;
            };
            const item: IItem = { x: SANCTUARY_X, y: SANCTUARY_Y, size: SANCTUARY_SIZE, itemType: ItemType.LifeSanctuary };

            expect(sanctuaryAccessor.getSanctuaryBgPosition(SANCTUARY_X, SANCTUARY_Y, item)).toBe(PERCENT_TOP_LEFT);
            expect(sanctuaryAccessor.getSanctuaryBgPosition(SANCTUARY_X, SANCTUARY_Y + OFFSET_ONE, item)).toBe(PERCENT_TOP_RIGHT);
            expect(sanctuaryAccessor.getSanctuaryBgPosition(SANCTUARY_X + OFFSET_ONE, SANCTUARY_Y, item)).toBe(PERCENT_BOTTOM_LEFT);
            expect(sanctuaryAccessor.getSanctuaryBgPosition(SANCTUARY_X + OFFSET_ONE, SANCTUARY_Y + OFFSET_ONE, item)).toBe(PERCENT_BOTTOM_RIGHT);
            expect(sanctuaryAccessor.getSanctuaryBgPosition(ORIGIN_X, ORIGIN_Y, item)).toBe('');
        });
    });

    describe('cellDescription', () => {
        it('should return description for Grass cell type', () => {
            const description = component.cellDescription(CellType.Grass);
            expect(description).toBeDefined();
            expect(typeof description).toBe('string');
        });

        it('should return description for Wall cell type', () => {
            const description = component.cellDescription(CellType.Wall);
            expect(description).toBeDefined();
            expect(typeof description).toBe('string');
        });

        it('should return description for Ice cell type', () => {
            const description = component.cellDescription(CellType.Ice);
            expect(description).toBeDefined();
            expect(typeof description).toBe('string');
        });
    });

    describe('objectExtraStyles', () => {
        const SANCTUARY_X = 2;
        const SANCTUARY_Y = 3;
        const SANCTUARY_SIZE = 4;
        const SINGLE_ITEM_SIZE = 1;
        const ORIGIN_X = 0;
        const ORIGIN_Y = 0;
        const OFFSET_ONE = 1;

        it('objectExtraStyles returns css for sanctuary items', () => {
            const item: IItem = { x: OFFSET_ONE, y: OFFSET_ONE, size: SANCTUARY_SIZE, itemType: ItemType.LifeSanctuary };
            const styles = component.objectExtraStyles(item, OFFSET_ONE, OFFSET_ONE);
            expect(styles['background-position']).toBeDefined();
        });

        it('objectExtraStyles returns empty for non-sanctuary', () => {
            const item: IItem = { x: ORIGIN_X, y: ORIGIN_Y, size: SINGLE_ITEM_SIZE, itemType: ItemType.Flag };
            expect(component.objectExtraStyles(item, ORIGIN_X, ORIGIN_Y)).toEqual({});
        });

        it('should return empty object when item is null', () => {
            const result = component.objectExtraStyles(null as unknown as IItem, 0, 0);
            expect(result).toEqual({});
        });

        it('should return empty object when item is undefined', () => {
            const result = component.objectExtraStyles(undefined as unknown as IItem, 0, 0);
            expect(result).toEqual({});
        });

        it('should return background position for FightSanctuary', () => {
            const item: IItem = { x: SANCTUARY_X, y: SANCTUARY_Y, size: SANCTUARY_SIZE, itemType: ItemType.FightSanctuary };
            const styles = component.objectExtraStyles(item, SANCTUARY_X, SANCTUARY_Y);
            expect(styles['background-position']).toBeDefined();
        });
    });

    describe('submitGameForm', () => {
        beforeEach(fakeAsync(() => {
            paramsSubject.next({ gameId: 'test-game-id' });
            fixture.detectChanges();
            tick();
        }));

        it('should call submitForm with correct parameters and navigate on success', fakeAsync(() => {
            gameEditFormServiceSpy.submitForm.and.returnValue(Promise.resolve());
            component.grid = { nativeElement: document.createElement('div') };
            component.editedGame = mockGame;

            component.submitGameForm();
            tick();

            expect(gameEditFormServiceSpy.submitForm).toHaveBeenCalledWith(
                component.editedGame._id,
                boardEditorServiceSpy.gameCells,
                boardEditorServiceSpy.objects,
                component.grid?.nativeElement ?? null,
            );
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin']);
        }));

        it('should handle submit failure and not navigate', async () => {
            const error = new Error('Submit failed');
            gameEditFormServiceSpy.submitForm.and.returnValue(Promise.reject(error));
            component.grid = { nativeElement: document.createElement('div') };
            component.editedGame = mockGame;

            try {
                await component.submitGameForm();
            } catch {
                // swallow
            }

            expect(routerSpy.navigate).not.toHaveBeenCalled();
        });

        it('should pass null grid when grid is undefined', fakeAsync(() => {
            gameEditFormServiceSpy.submitForm.and.returnValue(Promise.resolve());
            component.grid = undefined;
            component.editedGame = mockGame;

            component.submitGameForm();
            tick();

            const call = gameEditFormServiceSpy.submitForm.calls.mostRecent();
            expect(call.args[3]).toBeNull();
        }));

        it('should return early when editedGame is null', async () => {
            component.editedGame = null;

            await component.submitGameForm();

            expect(gameEditFormServiceSpy.submitForm).not.toHaveBeenCalled();
            expect(routerSpy.navigate).not.toHaveBeenCalled();
        });

        it('should return early when editedGame is undefined', async () => {
            component.editedGame = undefined as unknown as IExistingGame;

            await component.submitGameForm();

            expect(gameEditFormServiceSpy.submitForm).not.toHaveBeenCalled();
            expect(routerSpy.navigate).not.toHaveBeenCalled();
        });
    });

    describe('toggleDoor', () => {
        const TOGGLE_ROW = 0;
        const TOGGLE_COL = 0;

        it('should toggle from ClosedDoor to OpenDoor', () => {
            boardEditorServiceSpy.activeTool = ToolOption.Placement;
            boardEditorServiceSpy.selectedMaterial = CellType.OpenDoor;
            boardEditorServiceSpy.gameCells = [[CellType.ClosedDoor]];

            const mouseEvent = new MouseEvent('mousedown', { button: LEFT_BUTTON });
            component.onMouseDown(TOGGLE_ROW, TOGGLE_COL, mouseEvent);

            expect(boardEditorServiceSpy.gameCells[TOGGLE_ROW][TOGGLE_COL]).toBe(CellType.OpenDoor);
        });

        it('should toggle from OpenDoor to ClosedDoor', () => {
            boardEditorServiceSpy.activeTool = ToolOption.Placement;
            boardEditorServiceSpy.selectedMaterial = CellType.OpenDoor;
            boardEditorServiceSpy.gameCells = [[CellType.OpenDoor]];

            const mouseEvent = new MouseEvent('mousedown', { button: LEFT_BUTTON });
            component.onMouseDown(TOGGLE_ROW, TOGGLE_COL, mouseEvent);

            expect(boardEditorServiceSpy.gameCells[TOGGLE_ROW][TOGGLE_COL]).toBe(CellType.ClosedDoor);
        });

        it('should toggle back to OpenDoor after two toggles', () => {
            boardEditorServiceSpy.activeTool = ToolOption.Placement;
            boardEditorServiceSpy.selectedMaterial = CellType.OpenDoor;
            boardEditorServiceSpy.gameCells = [[CellType.OpenDoor]];

            const mouseEvent = new MouseEvent('mousedown', { button: LEFT_BUTTON });

            component.onMouseDown(TOGGLE_ROW, TOGGLE_COL, mouseEvent);
            expect(boardEditorServiceSpy.gameCells[TOGGLE_ROW][TOGGLE_COL]).toBe(CellType.ClosedDoor);

            component.onMouseDown(TOGGLE_ROW, TOGGLE_COL, mouseEvent);
            expect(boardEditorServiceSpy.gameCells[TOGGLE_ROW][TOGGLE_COL]).toBe(CellType.OpenDoor);
        });
    });

    describe('revertToOriginal', () => {
        it('should revert grid and form to previousVersion', () => {
            component.previousVersion = mockGame;

            component.revertToOriginal();

            expect(boardEditorServiceSpy.revertGrid).toHaveBeenCalledWith(mockGame);
            expect(gameEditFormServiceSpy.init).toHaveBeenCalledWith(mockGame);
        });
    });

    describe('getGridElement', () => {
        it('should return grid nativeElement when grid exists', () => {
            const mockElement = document.createElement('div');
            component.grid = { nativeElement: mockElement };
            const gridAccessor = component as unknown as { getGridElement: () => HTMLElement | null };

            const result = gridAccessor.getGridElement();

            expect(result).toBe(mockElement);
        });

        it('should return null when grid is undefined', () => {
            component.grid = undefined;
            const gridAccessor = component as unknown as { getGridElement: () => HTMLElement | null };

            const result = gridAccessor.getGridElement();

            expect(result).toBeNull();
        });
    });
});
