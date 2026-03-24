/**
 * Testing strategy — EditionPageComponent
 *
 * Approach:
 * - Drive the page with a stubbed ActivatedRoute so route-based initialization
 *   and cleanup can be tested without a full router harness.
 * - Exercise the public event handlers directly to validate tile/object edits,
 *   form submission, grid resizing, and revert behavior.
 * - Keep the assertions focused on editor state and service interactions so the
 *   spec stays resilient to template refactors.
 *
 * Edge cases covered:
 * - Creation mode should reuse a draft game when one exists or fall back to a
 *   default empty board when it does not.
 * - Null game responses, empty submissions, and rejected saves should not break
 *   the page state.
 * - Mouse helpers should respect drawing, shift, and right-click behavior.
 */
import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { GridSize, ToolOption } from '@app/constants/grid-edition';
import { GameService } from '@app/services/admin/game.service';
import { BoardEditorService } from '@app/services/editor/edition.service';
import { GameEditFormService } from '@app/services/forms/game-edit-form.service';
import { CellType } from '@common/board';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { IItem, ItemType, SMALL_ITEM_SIZE } from '@common/items';
import { Subject, of, Subscription } from 'rxjs';
import { EditionPageComponent } from './edition-page.component';

describe('EditionPageComponent', () => {
    let fixture: ComponentFixture<EditionPageComponent>;
    let component: EditionPageComponent;
    let routeParams$: Subject<{ gameId: string }>;
    let gameServiceSpy: jasmine.SpyObj<GameService> & { gameUnderCreation?: IExistingGame };
    let routerSpy: jasmine.SpyObj<Router>;
    let boardEditorService: BoardEditorService;
    let gameEditFormServiceStub: GameEditFormServiceStub;

    const randomGame = createGame(GameType.Ctf);

    beforeEach(async () => {
        routeParams$ = new Subject<{ gameId: string }>();
        gameServiceSpy = {
            getGameById: jasmine.createSpy('getGameById'),
            gameUnderCreation: undefined,
        } as jasmine.SpyObj<GameService> & { gameUnderCreation?: IExistingGame };
        gameServiceSpy.getGameById.and.returnValue(of(randomGame));

        routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
        routerSpy.navigate.and.returnValue(Promise.resolve(true));

        gameEditFormServiceStub = {
            init: jasmine.createSpy('init'),
            submitForm: jasmine.createSpy('submitForm').and.returnValue(Promise.resolve()),
            formErrors: [],
            formValid: true,
            isSubmitting: signal(false),
        } as unknown as GameEditFormServiceStub;

        await TestBed.configureTestingModule({
            imports: [EditionPageComponent],
            providers: [
                { provide: ActivatedRoute, useValue: { params: routeParams$.asObservable() } },
                { provide: Router, useValue: routerSpy },
                { provide: GameService, useValue: gameServiceSpy },
                { provide: GameEditFormService, useValue: gameEditFormServiceStub },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EditionPageComponent);
        component = fixture.componentInstance;
        boardEditorService = TestBed.inject(BoardEditorService);
    });

    it('should load an existing game and initialize the editor', fakeAsync(() => {
        const componentApi = component as unknown as EditionPageApi;
        const unsubscribeSpy = jasmine.createSpy('unsubscribe');
        componentApi.gameServiceSubscription = { unsubscribe: unsubscribeSpy } as unknown as Subscription;

        const buildGridSpy = spyOn(boardEditorService, 'buildGrid').and.callThrough();
        const initFromExistingBoardSpy = spyOn(boardEditorService, 'initFromExistingBoard').and.callThrough();

        component.ngOnInit();
        routeParams$.next({ gameId: '123' });
        tick();

        expect(unsubscribeSpy).toHaveBeenCalled();
        expect(gameServiceSpy.getGameById).toHaveBeenCalledWith('123');
        expect(component.editedGame).toBe(randomGame);
        expect(component.previousVersion).toEqual(randomGame);
        expect(component.previousVersion).not.toBe(randomGame);
        expect(buildGridSpy).toHaveBeenCalledWith(randomGame.board.cells.length);
        expect(initFromExistingBoardSpy).toHaveBeenCalledWith(randomGame);
        expect(boardEditorService.gameMode).toBe(randomGame.gameMode);
        expect(boardEditorService.activeTool).toBe(ToolOption.Placement);
        expect(boardEditorService.selectedMaterial).toBe(CellType.Empty);
        expect(boardEditorService.selectedObject).toBeNull();
        expect(gameEditFormServiceStub.init).toHaveBeenCalledWith(randomGame);
        expect(componentApi.isLoading()).toBeFalse();
        expect(componentApi.showButton()).toBeTrue();

        component.ngOnDestroy();
    }));

    it('should ignore null game responses', fakeAsync(() => {
        gameServiceSpy.getGameById.and.returnValue(of(null as unknown as IExistingGame));
        const buildGridSpy = spyOn(boardEditorService, 'buildGrid').and.callThrough();
        const componentApi = component as unknown as EditionPageApi;

        component.ngOnInit();
        routeParams$.next({ gameId: '123' });
        tick();

        expect(component.editedGame).toBeNull();
        expect(buildGridSpy).not.toHaveBeenCalled();
        expect(gameEditFormServiceStub.init).not.toHaveBeenCalled();
        expect(componentApi.isLoading()).toBeFalse();
        expect(componentApi.showButton()).toBeTrue();

        component.ngOnDestroy();
    }));

    it('should reuse a draft game on creation and clear the previous subscription', fakeAsync(() => {
        gameServiceSpy.gameUnderCreation = randomGame;
        const componentApi = component as unknown as EditionPageApi;
        const unsubscribeSpy = jasmine.createSpy('unsubscribe');
        componentApi.gameServiceSubscription = { unsubscribe: unsubscribeSpy } as unknown as Subscription;

        const buildGridSpy = spyOn(boardEditorService, 'buildGrid').and.callThrough();

        component.ngOnInit();
        routeParams$.next({ gameId: 'creation' });
        tick();

        expect(unsubscribeSpy).toHaveBeenCalled();
        expect(gameServiceSpy.getGameById).not.toHaveBeenCalled();
        expect(component.editedGame).toBe(randomGame);
        expect(component.previousVersion).toEqual(randomGame);
        expect(component.previousVersion).not.toBe(randomGame);
        expect(buildGridSpy).toHaveBeenCalledWith(randomGame.board.cells.length);
        expect(gameEditFormServiceStub.init).toHaveBeenCalledWith(randomGame);
        expect(componentApi.isLoading()).toBeFalse();
        expect(componentApi.showButton()).toBeTrue();

        component.ngOnDestroy();
    }));

    it('should create a default game when creation has no draft', fakeAsync(() => {
        const buildGridSpy = spyOn(boardEditorService, 'buildGrid').and.callThrough();
        const componentApi = component as unknown as EditionPageApi;

        component.ngOnInit();
        routeParams$.next({ gameId: 'creation' });
        tick();

        const firstRow = firstIndex(component.previousVersion.board.cells);
        const firstCol = firstIndex(component.previousVersion.board.cells[firstRow]);

        expect(gameServiceSpy.getGameById).not.toHaveBeenCalled();
        expect(component.editedGame).not.toBeNull();
        expect(component.editedGame?.board.cells.length).toBe(GridSize.SMALL);
        expect(component.previousVersion.board.cells.length).toBe(GridSize.SMALL);
        expect(component.previousVersion.board.cells[firstRow][firstCol]).toBe(CellType.Empty);
        expect(buildGridSpy).toHaveBeenCalledWith(GridSize.SMALL);
        expect(gameEditFormServiceStub.init).toHaveBeenCalledWith(component.editedGame as IExistingGame);
        expect(componentApi.isLoading()).toBeFalse();
        expect(componentApi.showButton()).toBeTrue();

        component.ngOnDestroy();
    }));

    it('should update mouse state and handle mouse down actions', () => {
        const componentApi = component as unknown as EditionPageApi;
        const preventDefaultSpy = jasmine.createSpy('preventDefault');
        const leftMouseEvent = createMouseEvent(LEFT_MOUSE_BUTTON, NO_BUTTONS, preventDefaultSpy);
        const rightMouseEvent = createMouseEvent(RIGHT_MOUSE_BUTTON, RIGHT_MOUSE_BUTTONS, preventDefaultSpy);
        const applyTileSpy = spyOn(boardEditorService, 'applyTile').and.callThrough();
        const applyObjectSpy = spyOn(boardEditorService, 'applyObject').and.callThrough();
        const eraseTileSpy = spyOn(boardEditorService, 'eraseTile').and.callThrough();

        boardEditorService.buildGrid(GridSize.MEDIUM);
        boardEditorService.selectedMaterial = CellType.Water;
        boardEditorService.selectedObject = ItemType.Flag;
        boardEditorService.activeTool = ToolOption.Placement;

        const firstRow = firstIndex(boardEditorService.gameCells);
        const firstCol = firstIndex(boardEditorService.gameCells[firstRow]);
        const secondCol = secondIndex(boardEditorService.gameCells[firstRow], firstCol);

        boardEditorService.gameCells[firstRow][firstCol] = CellType.Ice;
        boardEditorService.gameCells[firstRow][secondCol] = CellType.Water;

        component.onMouseDown(firstRow, firstCol, leftMouseEvent);
        expect(applyTileSpy).toHaveBeenCalledWith(firstRow, firstCol);

        boardEditorService.activeTool = ToolOption.Objects;
        component.onMouseDown(firstRow, firstCol, leftMouseEvent);
        expect(applyObjectSpy).toHaveBeenCalledWith(firstRow, firstCol);

        component.onMouseDown(firstRow, secondCol, rightMouseEvent);
        expect(eraseTileSpy).toHaveBeenCalledWith(firstRow, secondCol);
        expect(componentApi.mouseState.isDrawing).toBeTrue();
        expect(componentApi.mouseState.lastIndexes).toEqual([firstRow, secondCol]);

        component.stopDrawing();
        component.onShiftDown();
        component.onShiftUp();

        expect(componentApi.mouseState.isDrawing).toBeFalse();
        expect(componentApi.mouseState.isShiftPressed).toBeFalse();
        expect(preventDefaultSpy).toHaveBeenCalledTimes([leftMouseEvent, leftMouseEvent, rightMouseEvent].length);
    });

    it('should handle mouse enter dragging and right-click erasing', () => {
        const componentApi = component as unknown as EditionPageApi;
        const applyTileSpy = spyOn(boardEditorService, 'applyTile').and.callThrough();
        const eraseObjectSpy = spyOn(boardEditorService, 'eraseObject').and.callThrough();

        boardEditorService.buildGrid(GridSize.MEDIUM);
        boardEditorService.selectedMaterial = CellType.Water;
        boardEditorService.selectedObject = ItemType.Flag;

        const firstRow = firstIndex(boardEditorService.gameCells);
        const firstCol = firstIndex(boardEditorService.gameCells[firstRow]);
        const secondCol = secondIndex(boardEditorService.gameCells[firstRow], firstCol);

        boardEditorService.gameCells[firstRow][secondCol] = CellType.Ice;
        boardEditorService.objects = [createItem(ItemType.Flag, firstRow, secondCol, SMALL_ITEM_SIZE)];

        componentApi.mouseState.isDrawing = false;
        component.onMouseEnter(firstRow, secondCol, createMouseEvent(RIGHT_MOUSE_BUTTON, RIGHT_MOUSE_BUTTONS, jasmine.createSpy('preventDefault')));
        expect(applyTileSpy).not.toHaveBeenCalled();

        componentApi.mouseState.isDrawing = true;
        componentApi.mouseState.lastIndexes = [firstRow, firstCol];
        boardEditorService.activeTool = ToolOption.Objects;
        component.onMouseEnter(firstRow, secondCol, createMouseEvent(NO_BUTTONS, NO_BUTTONS, jasmine.createSpy('preventDefault')));
        expect(applyTileSpy).not.toHaveBeenCalled();

        boardEditorService.activeTool = ToolOption.Placement;
        componentApi.mouseState.lastIndexes = [firstRow, firstCol];
        component.onMouseEnter(firstRow, secondCol, createMouseEvent(NO_BUTTONS, NO_BUTTONS, jasmine.createSpy('preventDefault')));
        expect(applyTileSpy).toHaveBeenCalledWith(firstRow, secondCol);

        componentApi.mouseState.isShiftPressed = true;
        componentApi.mouseState.lastIndexes = [firstRow, firstCol];
        component.onMouseEnter(firstRow, secondCol, createMouseEvent(NO_BUTTONS, RIGHT_MOUSE_BUTTONS, jasmine.createSpy('preventDefault')));
        expect(eraseObjectSpy).toHaveBeenCalledWith(firstRow, secondCol);
    });

    it('should build the grid and blur it after resizing', fakeAsync(() => {
        const componentApi = component as unknown as EditionPageApi;
        const blurElement = document.createElement('button');
        const blurSpy = spyOn(blurElement, 'blur').and.stub();
        const buildGridSpy = spyOn(boardEditorService, 'buildGrid').and.callThrough();

        componentApi.gridPanel = {
            getGridElement: () => blurElement,
        };

        component.setGridSize(GridSize.SMALL);
        tick();

        expect(buildGridSpy).toHaveBeenCalledWith(GridSize.SMALL);
        expect(blurSpy).toHaveBeenCalled();
    }));

    it('should submit the form and navigate back on success', fakeAsync(() => {
        const componentApi = component as unknown as EditionPageApi;
        const gridElement = document.createElement('div');
        const submitFormSpy = gameEditFormServiceStub.submitForm as jasmine.Spy;

        submitFormSpy.and.returnValue(Promise.resolve());
        boardEditorService.buildGrid(GridSize.MEDIUM);
        boardEditorService.gameMode = GameType.Ctf;
        component.editedGame = randomGame;
        componentApi.gridPanel = {
            getGridElement: () => gridElement,
        };

        component.submitGameForm();
        flushMicrotasks();

        expect(submitFormSpy).toHaveBeenCalledWith(
            randomGame._id,
            GameType.Ctf,
            boardEditorService.gameCells,
            boardEditorService.objects,
            gridElement,
        );
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin']);
    }));

    it('should ignore submission when no game is being edited', () => {
        const submitFormSpy = gameEditFormServiceStub.submitForm as jasmine.Spy;

        component.editedGame = null;
        component.submitGameForm();

        expect(submitFormSpy).not.toHaveBeenCalled();
        expect(routerSpy.navigate).not.toHaveBeenCalled();
    });

    it('should swallow submission failures without navigating', fakeAsync(() => {
        const submitFormSpy = gameEditFormServiceStub.submitForm as jasmine.Spy;

        submitFormSpy.and.returnValue(Promise.reject(new Error('boom')));
        component.editedGame = randomGame;

        component.submitGameForm();
        flushMicrotasks();

        expect(routerSpy.navigate).not.toHaveBeenCalled();
    }));

    it('should revert the board and reset the editor state', () => {
        const componentApi = component as unknown as EditionPageApi;
        const revertGridSpy = spyOn(boardEditorService, 'revertGrid').and.callThrough();

        boardEditorService.buildGrid(GridSize.MEDIUM);
        const firstRow = firstIndex(boardEditorService.gameCells);
        const firstCol = firstIndex(boardEditorService.gameCells[firstRow]);

        boardEditorService.gameCells[firstRow][firstCol] = CellType.Water;
        boardEditorService.objects = [createItem(ItemType.Flag, firstRow, firstCol, SMALL_ITEM_SIZE)];
        boardEditorService.activeTool = ToolOption.Objects;
        boardEditorService.selectedMaterial = CellType.Water;
        boardEditorService.selectedObject = ItemType.Flag;
        componentApi.previousVersion = createGame(GameType.Classic);
        gameEditFormServiceStub.formErrors = ['Erreur'];

        component.revertToOriginal();

        expect(revertGridSpy).toHaveBeenCalledWith(componentApi.previousVersion);
        expect(boardEditorService.gameCells).toEqual(componentApi.previousVersion.board.cells);
        expect(boardEditorService.objects).toEqual(componentApi.previousVersion.board.items);
        expect(boardEditorService.activeTool).toBe(ToolOption.Placement);
        expect(boardEditorService.selectedMaterial).toBe(CellType.Empty);
        expect(boardEditorService.selectedObject).toBeNull();
        expect(gameEditFormServiceStub.init).toHaveBeenCalledWith(componentApi.previousVersion);
        expect(gameEditFormServiceStub.formErrors).toEqual([]);
    });

    it('should clear subscriptions and pending timeout on destroy', () => {
        const componentApi = component as unknown as EditionPageApi;
        const routeUnsubscribeSpy = jasmine.createSpy('routeUnsubscribe');
        const gameUnsubscribeSpy = jasmine.createSpy('gameUnsubscribe');
        const timeoutId = 'timeout-id' as unknown as ReturnType<typeof setTimeout>;
        const clearTimeoutSpy = spyOn(window, 'clearTimeout').and.stub();

        componentApi.routeSubscription = { unsubscribe: routeUnsubscribeSpy } as unknown as Subscription;
        componentApi.gameServiceSubscription = { unsubscribe: gameUnsubscribeSpy } as unknown as Subscription;
        componentApi.buttonTimeoutId = timeoutId;

        component.ngOnDestroy();

        expect(routeUnsubscribeSpy).toHaveBeenCalled();
        expect(gameUnsubscribeSpy).toHaveBeenCalled();
        expect(clearTimeoutSpy).toHaveBeenCalledWith(timeoutId);
    });

    it('should ignore destroy when nothing was initialized', () => {
        expect(() => component.ngOnDestroy()).not.toThrow();
    });
});

const LEFT_MOUSE_BUTTON = Number('0');
const RIGHT_MOUSE_BUTTON = Number('2');
const NO_BUTTONS = Number('0');
const RIGHT_MOUSE_BUTTONS = Number('2');

function createMouseEvent(button: number, buttons: number, preventDefaultSpy: jasmine.Spy): MouseEvent {
    return {
        button,
        buttons,
        preventDefault: preventDefaultSpy,
    } as unknown as MouseEvent;
}

function createItem(itemType: ItemType, x: number, y: number, size: number): IItem {
    return {
        itemType,
        x,
        y,
        size,
    };
}

function firstIndex<T>(items: readonly T[]): number {
    return items.findIndex(() => true);
}

function secondIndex<T>(items: readonly T[], first: number): number {
    return items.findIndex((_, index) => index !== first);
}

function createGame(gameMode: GameType): IExistingGame {
    const boardSize = GridSize.MEDIUM;
    const boardCells = Array.from({ length: boardSize }, () => Array.from({ length: boardSize }, () => CellType.Empty));
    const referenceDate = new Date('2026-01-01T00:00:00.000Z');

    return {
        _id: 'game-1',
        gameTitle: 'Test Game',
        description: 'A game for testing',
        board: {
            cells: boardCells,
            items: [],
        },
        gameMode,
        lastModifiedDate: referenceDate,
        visibility: Visibility.Hidden,
        dateCreated: referenceDate,
        preview: '' as Base64URLString,
    };
}

type EditionPageApi = {
    isLoading: () => boolean;
    showButton: () => boolean;
    previousVersion: IExistingGame;
    mouseState: {
        isDrawing: boolean;
        isShiftPressed: boolean;
        lastIndexes: [number, number];
    };
    gridPanel?: {
        getGridElement(): HTMLElement | null;
    };
    routeSubscription?: Subscription;
    gameServiceSubscription?: Subscription;
    buttonTimeoutId?: ReturnType<typeof setTimeout>;
};

type GameEditFormServiceStub = {
    init: jasmine.Spy;
    submitForm: jasmine.Spy;
    formErrors: string[];
    formValid: boolean;
    isSubmitting: WritableSignal<boolean>;
};
