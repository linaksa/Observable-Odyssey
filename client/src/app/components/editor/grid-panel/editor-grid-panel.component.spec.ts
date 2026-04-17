/**
 * Testing strategy — Editor Grid Panel Component
 *
 * Approach:
 * - Stub board/form signals and drive the component through hover + tool transitions.
 * - Validate preview generation, tooltip/highlight helpers, and output forwarding.
 *
 * Edge cases covered:
 * - Placement/object previews should return null for invalid hover, stock, or placement states.
 * - Grid element access should be safe when ViewChild is not set.
 */
import { ElementRef, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToolOption } from '@app/constants/grid-editor';
import { BoardEditorService } from '@app/services/editor/editor.service';
import { GameEditFormService } from '@app/services/forms/game-edit-form.service';
import { CellType } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { ItemType, IItem } from '@common/items';
import { EditorGridPanelComponent } from './editor-grid-panel.component';

describe('EditorGridPanelComponent', () => {
    let component: EditorGridPanelComponent;
    let fixture: ComponentFixture<EditorGridPanelComponent>;

    let remainingObjectCountSpy: jasmine.Spy<(type: ItemType) => number>;
    let placementValidationSpy: jasmine.Spy<(row: number, col: number) => boolean>;

    let boardEditorServiceStub: {
        activeTool: ToolOption;
        selectedMaterial: CellType;
        selectedObject?: ItemType;
        gameCellsSignal: ReturnType<typeof signal<CellType[][]>>;
        objectsSignal: ReturnType<typeof signal<IItem[]>>;
        getRemainingObjectCount: jasmine.Spy<(type: ItemType) => number>;
        isSelectedObjectPlacementPositionValid: jasmine.Spy<(row: number, col: number) => boolean>;
    };

    let gameEditFormServiceStub: {
        validationErrorCodes: ReturnType<typeof signal<readonly ErrorCode[]>>;
    };

    beforeEach(async () => {
        remainingObjectCountSpy = jasmine.createSpy('getRemainingObjectCount').and.returnValue(1);
        placementValidationSpy = jasmine.createSpy('isSelectedObjectPlacementPositionValid').and.returnValue(true);

        boardEditorServiceStub = {
            activeTool: ToolOption.Placement,
            selectedMaterial: CellType.Ice,
            selectedObject: ItemType.Flag,
            gameCellsSignal: signal<CellType[][]>([[CellType.Empty]]),
            objectsSignal: signal<IItem[]>([]),
            getRemainingObjectCount: remainingObjectCountSpy,
            isSelectedObjectPlacementPositionValid: placementValidationSpy,
        };

        gameEditFormServiceStub = {
            validationErrorCodes: signal<readonly ErrorCode[]>([]),
        };

        TestBed.overrideComponent(EditorGridPanelComponent, { set: { template: '' } });

        await TestBed.configureTestingModule({
            imports: [EditorGridPanelComponent],
            providers: [
                { provide: BoardEditorService, useValue: boardEditorServiceStub },
                { provide: GameEditFormService, useValue: gameEditFormServiceStub },
            ],
        }).compileComponents();
        createComponent();
    });

    it('should expose grid element safely', () => {
        expect(component.getGridElement()).toBeNull();

        const nativeElement = document.createElement('div');
        (component as unknown as { grid: ElementRef<HTMLElement> }).grid = { nativeElement } as ElementRef<HTMLElement>;

        expect(component.getGridElement()).toBe(nativeElement);
    });

    it('should update hover state and emit cell enter events', () => {
        const emitSpy = jasmine.createSpy('cellMouseEnter');
        const event = { rowIndex: 0, colIndex: 0, cellType: CellType.Empty, item: null, event: new MouseEvent('mousedown') };

        component.cellMouseEnter.subscribe(emitSpy);

        component.onCellMouseEnter(event);

        expect(emitSpy).toHaveBeenCalledWith(event);
        expect((component as unknown as { placementPreview: () => unknown }).placementPreview()).toEqual({
            rowIndex: 0,
            colIndex: 0,
            cellType: CellType.Ice,
        });

        component.onCellMouseLeave();

        expect((component as unknown as { placementPreview: () => unknown }).placementPreview()).toBeNull();
    });

    it('should compute object placement preview across valid and invalid branches', () => {
        const hoverEvent = {
            rowIndex: 1,
            colIndex: 2,
            cellType: CellType.Empty,
            item: null,
            event: new MouseEvent('mouseenter'),
        };
        boardEditorServiceStub.activeTool = ToolOption.Objects;

        boardEditorServiceStub.selectedObject = undefined;
        createComponent();
        component.onCellMouseEnter(hoverEvent);
        expect((component as unknown as { placementPreview: () => unknown }).placementPreview()).toBeNull();

        boardEditorServiceStub.selectedObject = ItemType.Flag;
        createComponent();
        expect((component as unknown as { placementPreview: () => unknown }).placementPreview()).toBeNull();

        remainingObjectCountSpy.and.returnValue(0);
        createComponent();
        component.onCellMouseEnter(hoverEvent);
        expect((component as unknown as { placementPreview: () => unknown }).placementPreview()).toBeNull();

        remainingObjectCountSpy.and.returnValue(1);
        placementValidationSpy.and.returnValue(false);
        createComponent();
        component.onCellMouseEnter(hoverEvent);
        expect((component as unknown as { placementPreview: () => unknown }).placementPreview()).toBeNull();

        // Nominal case: object preview is returned when all placement constraints pass.
        placementValidationSpy.and.returnValue(true);
        createComponent();
        component.onCellMouseEnter(hoverEvent);
        expect((component as unknown as { placementPreview: () => unknown }).placementPreview()).toEqual({
            rowIndex: 1,
            colIndex: 2,
            itemType: ItemType.Flag,
        });

        // Edge case: unsupported tool should always return null.
        boardEditorServiceStub.activeTool = 'other' as ToolOption;
        createComponent();
        component.onCellMouseEnter(hoverEvent);
        expect((component as unknown as { placementPreview: () => unknown }).placementPreview()).toBeNull();
    });

    it('should build tooltip text and highlighted tiles from validation data', () => {
        const tooltipText = (
            component as unknown as {
                getTooltipText: (row: number, col: number, cellType: CellType, item: IItem | null) => string | null;
            }
        ).getTooltipText(0, 0, CellType.Empty, null);

        expect(tooltipText).toContain('Tuile de base');
        expect((component as unknown as { highlightedTiles: () => ReadonlySet<number> | null }).highlightedTiles()).toBeNull();

        gameEditFormServiceStub.validationErrorCodes.set([ErrorCode.BoardInvalidDoorPlacement]);
        boardEditorServiceStub.gameCellsSignal.set([
            [CellType.Empty, CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.OpenDoor, CellType.Empty],
            [CellType.Empty, CellType.Empty, CellType.Empty],
        ]);

        const highlighted = (component as unknown as { highlightedTiles: () => ReadonlySet<number> | null }).highlightedTiles();
        expect(highlighted instanceof Set).toBeTrue();
    });

    function createComponent(): void {
        fixture = TestBed.createComponent(EditorGridPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }
});
