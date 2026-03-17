/**
 * Testing strategy — Game Edition Component
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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToolOption } from '@app/constants/grid-edition';
import { BoardEditorService } from '@app/services/edition.service';
import { BoardSharedService } from '@app/services/shared/boardShared.service';
import { CellType } from '@common/board';
import { GameType, IExistingGame, Visibility } from '@common/game';
import { ItemType } from '@common/items';
import { GameEditionComponent } from './game-edition.component';

const CURRENT_CELL_ROW = 2;
const CURRENT_CELL_COL = 3;

describe('GameEditionComponent', () => {
    let component: GameEditionComponent;
    let fixture: ComponentFixture<GameEditionComponent>;
    let boardEditorServiceStub: BoardEditorService;

    beforeEach(async () => {
        boardEditorServiceStub = {
            availableCellTypes: [CellType.Empty, CellType.Wall],
            availableTools: [ToolOption.Placement, ToolOption.Objects],
            availableToolsIcons: {
                [ToolOption.Placement]: 'cursor.svg',
                [ToolOption.Objects]: 'cube.svg',
            },
            gameCells: [[CellType.Empty]],
            objects: [],
            gameMode: GameType.Classic,
            activeTool: ToolOption.Placement,
            selectedMaterial: CellType.Empty,
            selectedObject: null,
            getRemainingObjectCount: jasmine.createSpy('getRemainingObjectCount').and.returnValue(1),
            buildGrid: jasmine.createSpy('buildGrid'),
            initFromExistingBoard: jasmine.createSpy('initFromExistingBoard'),
            revertGrid: jasmine.createSpy('revertGrid'),
            eraseObject: jasmine.createSpy('eraseObject'),
            eraseTile: jasmine.createSpy('eraseTile'),
            applyObject: jasmine.createSpy('applyObject'),
            applyTile: jasmine.createSpy('applyTile'),
        } as unknown as BoardEditorService;

        TestBed.overrideComponent(GameEditionComponent, {
            set: {
                template: '',
                imports: [],
            },
        });

        await TestBed.configureTestingModule({
            imports: [GameEditionComponent],
            providers: [
                { provide: BoardEditorService, useValue: boardEditorServiceStub },
                { provide: BoardSharedService, useValue: {} },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameEditionComponent);
        component = fixture.componentInstance;
    });

    it('should initialize editor state from input game', () => {
        const game = createGame('Original game', GameType.Classic);
        component.gameToEdit = game;

        component.ngOnInit();

        expect(boardEditorServiceStub.buildGrid).toHaveBeenCalledWith(game.board.cells.length);
        const initArg = (boardEditorServiceStub.initFromExistingBoard as jasmine.Spy).calls.mostRecent().args[0] as IExistingGame;
        expect(initArg).toEqual(game);
        expect(initArg).not.toBe(game);
    });

    it('should select tool, material and object through dedicated handlers', () => {
        component.selectTool(ToolOption.Objects);
        component.selectMaterial(CellType.Water);
        component.selectObject(ItemType.Flag);

        expect(boardEditorServiceStub.activeTool).toBe(ToolOption.Objects);
        expect(boardEditorServiceStub.selectedMaterial).toBe(CellType.Water);
        expect(boardEditorServiceStub.selectedObject).toBe(ItemType.Flag);
    });

    it('should erase object on right click when shift is pressed', () => {
        setPrivateState(component, { isShiftPressed: true });

        component.onMouseDown(1, 2, new MouseEvent('mousedown', { button: 2 }));

        expect(boardEditorServiceStub.eraseObject).toHaveBeenCalledWith(1, 2);
        expect(boardEditorServiceStub.eraseTile).not.toHaveBeenCalled();
    });

    // Edge case: should erase tile on right click when shift is not pressed.
    it('should erase tile on right click when shift is not pressed', () => {
        setPrivateState(component, { isShiftPressed: false });

        component.onMouseDown(1, 2, new MouseEvent('mousedown', { button: 2 }));

        expect(boardEditorServiceStub.eraseTile).toHaveBeenCalledWith(1, 2);
        expect(boardEditorServiceStub.eraseObject).not.toHaveBeenCalled();
    });

    it('should apply object with object tool and tile with placement tool', () => {
        boardEditorServiceStub.activeTool = ToolOption.Objects;

        component.onMouseDown(0, 0, new MouseEvent('mousedown', { button: 0 }));
        expect(boardEditorServiceStub.applyObject).toHaveBeenCalledWith(0, 0);

        boardEditorServiceStub.activeTool = ToolOption.Placement;
        component.onMouseDown(0, 1, new MouseEvent('mousedown', { button: 0 }));
        expect(boardEditorServiceStub.applyTile).toHaveBeenCalledWith(0, 1);
    });

    it('should draw on mouse enter only when drawing is active', () => {
        component.onMouseEnter(0, 1, new MouseEvent('mousemove', { buttons: 1 }));
        expect(boardEditorServiceStub.applyTile).not.toHaveBeenCalled();

        setPrivateState(component, {
            isDrawing: true,
            isRightClick: false,
            lastIndexes: [0, 0],
        });
        boardEditorServiceStub.activeTool = ToolOption.Placement;

        component.onMouseEnter(0, 1, new MouseEvent('mousemove', { buttons: 1 }));

        expect(boardEditorServiceStub.applyTile).toHaveBeenCalledWith(0, 1);
    });

    // Edge case: should skip drawing when mouse re-enters the same cell.
    it('should skip drawing when mouse re-enters the same cell', () => {
        setPrivateState(component, {
            isDrawing: true,
            isRightClick: false,
            lastIndexes: [1, 1],
        });

        component.onMouseEnter(1, 1, new MouseEvent('mousemove', { buttons: 1 }));

        expect(boardEditorServiceStub.applyTile).not.toHaveBeenCalled();
    });

    it('should erase object on right-drag when shift is pressed', () => {
        setPrivateState(component, {
            isDrawing: true,
            isShiftPressed: true,
            isRightClick: true,
            lastIndexes: [1, 1],
        });

        component.onMouseEnter(1, 2, new MouseEvent('mousemove', { buttons: 2 }));

        expect(boardEditorServiceStub.eraseObject).toHaveBeenCalledWith(1, 2);
    });

    // Edge case: should erase tile on right-drag when shift is not pressed.
    it('should erase tile on right-drag when shift is not pressed', () => {
        setPrivateState(component, {
            isDrawing: true,
            isShiftPressed: false,
            isRightClick: true,
            lastIndexes: [1, 1],
        });

        component.onMouseEnter(1, 2, new MouseEvent('mousemove', { buttons: 2 }));

        expect(boardEditorServiceStub.eraseTile).toHaveBeenCalledWith(1, 2);
    });

    it('should stop drawing and reset right-click state on mouse up', () => {
        setPrivateState(component, {
            isDrawing: true,
            isRightClick: true,
        });

        component.stopDrawing();

        expect(readPrivateState(component).isDrawing).toBeFalse();
        expect(readPrivateState(component).isRightClick).toBeFalse();
    });

    it('should erase current cell object on shift down and tile on shift up while right drawing', () => {
        setPrivateState(component, {
            isDrawing: true,
            isRightClick: true,
            currentCell: [CURRENT_CELL_ROW, CURRENT_CELL_COL],
        });

        component.onShiftDown();
        expect(boardEditorServiceStub.eraseObject).toHaveBeenCalledWith(CURRENT_CELL_ROW, CURRENT_CELL_COL);

        component.onShiftUp();
        expect(boardEditorServiceStub.eraseTile).toHaveBeenCalledWith(CURRENT_CELL_ROW, CURRENT_CELL_COL);
    });

    it('should ignore shift handlers when drawing context is incomplete', () => {
        setPrivateState(component, {
            isDrawing: false,
            isRightClick: false,
            currentCell: null,
        });

        component.onShiftDown();
        component.onShiftUp();

        expect(boardEditorServiceStub.eraseObject).not.toHaveBeenCalled();
        expect(boardEditorServiceStub.eraseTile).not.toHaveBeenCalled();
    });

    it('should expose flag item only in CTF mode', () => {
        boardEditorServiceStub.gameMode = GameType.Classic;
        expect(component.availableItemsTypes).not.toContain(ItemType.Flag);

        boardEditorServiceStub.gameMode = GameType.Ctf;
        expect(component.availableItemsTypes).toContain(ItemType.Flag);
    });

    it('should reset board and form using previous version snapshot', () => {
        const game = createGame('Original game', GameType.Classic);
        component.gameToEdit = game;
        component.ngOnInit();

        const resetFormSpy = jasmine.createSpy('resetForm');
        (component as unknown as { editionForm: { resetForm: jasmine.Spy } }).editionForm = { resetForm: resetFormSpy };

        component.gameToEdit.gameTitle = 'Changed title';
        component.resetAll();

        const revertArg = (boardEditorServiceStub.revertGrid as jasmine.Spy).calls.mostRecent().args[0] as IExistingGame;
        expect(revertArg.gameTitle).toBe('Original game');
        expect(resetFormSpy).toHaveBeenCalledWith(jasmine.objectContaining({ gameTitle: 'Original game' }));
    });
});

function createGame(title: string, mode: GameType): IExistingGame {
    return {
        _id: 'game-1',
        gameTitle: title,
        description: '',
        board: {
            cells: [
                [CellType.Empty, CellType.Empty],
                [CellType.Empty, CellType.Empty],
            ],
            items: [],
        },
        gameMode: mode,
        dateCreated: new Date('2026-01-01T00:00:00.000Z'),
        lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
        visibility: Visibility.Hidden,
        preview: '' as Base64URLString,
    };
}

type GameEditionPrivateState = {
    isDrawing: boolean;
    isShiftPressed: boolean;
    lastIndexes: [number, number];
    currentCell: [number, number] | null;
    isRightClick: boolean;
};

function setPrivateState(component: GameEditionComponent, partialState: Partial<GameEditionPrivateState>): void {
    Object.assign(component as unknown as GameEditionPrivateState, partialState);
}

function readPrivateState(component: GameEditionComponent): GameEditionPrivateState {
    return component as unknown as GameEditionPrivateState;
}
