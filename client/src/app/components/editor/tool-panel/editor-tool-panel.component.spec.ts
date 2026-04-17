/**
 * Testing strategy — Editor Tool Panel Component
 *
 * Approach:
 * - Render the panel with a deterministic tool description map and editor stub.
 * - Verify tool buttons read from the provided input and emit selection events.
 * - Exercise the nested item selector outputs so panel forwarding remains covered.
 *
 * Edge cases covered:
 * - Both available tools should remain clickable and emit the correct enum value.
 * - Nested selector output bubbling should not depend on the active tool choice.
 */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EditorItemSelectorComponent } from '@app/components/editor/item-selector/editor-item-selector.component';
import { ToolOption } from '@app/constants/grid-editor';
import { ITEM_INFO_BY_TYPE, TILE_INFO_BY_TYPE } from '@app/constants/tile-info';
import { BoardEditorService } from '@app/services/editor/editor.service';
import { GameEditFormService } from '@app/services/forms/game-edit-form.service';
import { getErrorMessage } from '@app/utils/error-codes';
import { CellType } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { GameType } from '@common/game';
import { ItemType } from '@common/items';
import { EditorToolPanelComponent } from '@app/components/editor/tool-panel/editor-tool-panel.component';

describe('EditorToolPanelComponent', () => {
    let component: EditorToolPanelComponent;
    let fixture: ComponentFixture<EditorToolPanelComponent>;
    let boardEditorServiceStub: BoardEditorService;
    let gameEditFormServiceStub: GameEditFormService;
    let remainingObjectCountSpy: jasmine.Spy<(type: ItemType) => number>;

    beforeEach(async () => {
        remainingObjectCountSpy = jasmine.createSpy<(type: ItemType) => number>('getRemainingObjectCount').and.returnValue(1);
        boardEditorServiceStub = {
            activeTool: ToolOption.Placement,
            availableCellTypes: [CellType.Empty, CellType.Ice],
            availableObjectTypes: () => [ItemType.LifeSanctuary, ItemType.Flag],
            cellTypesInfo: TILE_INFO_BY_TYPE,
            getRemainingObjectCount: remainingObjectCountSpy,
            itemTypesInfo: ITEM_INFO_BY_TYPE,
            selectedMaterial: CellType.Empty,
            selectedObject: ItemType.Flag,
            availableTools: [ToolOption.Placement, ToolOption.Objects],
            gameMode: GameType.Ctf,
        } as unknown as BoardEditorService;
        gameEditFormServiceStub = {
            validationErrorCodes: signal<readonly ErrorCode[]>([]),
        } as unknown as GameEditFormService;

        await TestBed.configureTestingModule({
            imports: [EditorToolPanelComponent],
            providers: [
                { provide: BoardEditorService, useValue: boardEditorServiceStub },
                { provide: GameEditFormService, useValue: gameEditFormServiceStub },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EditorToolPanelComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('toolDescriptions', {
            [ToolOption.Placement]: 'Placement',
            [ToolOption.Objects]: 'Objects',
        });
        fixture.componentRef.setInput('toolIcons', {
            [ToolOption.Placement]: 'assets/editor/tile.svg',
            [ToolOption.Objects]: 'assets/editor/cube.svg',
        });
        fixture.detectChanges();
    });

    it('should render the provided tool descriptions and emit selected tools', () => {
        const buttons = fixture.nativeElement.querySelectorAll(
            'div.flex.shrink.flex-col.justify-center.gap-2 > button',
        ) as NodeListOf<HTMLButtonElement>;
        const emitted: ToolOption[] = [];

        component.toolSelected.subscribe((tool) => emitted.push(tool));

        expect(buttons.length).toBe(2);
        expect(buttons[0].textContent?.trim()).toBe('Placement');
        expect(buttons[1].textContent?.trim()).toBe('Objects');

        buttons[1].click();

        expect(emitted).toEqual([ToolOption.Objects]);
    });

    it('should forward nested selector output events', () => {
        const materialSpy = jasmine.createSpy('materialSelected');
        const objectSpy = jasmine.createSpy('objectSelected');
        component.materialSelected.subscribe(materialSpy);
        component.objectSelected.subscribe(objectSpy);

        const selector = fixture.debugElement.query(By.directive(EditorItemSelectorComponent)).componentInstance as EditorItemSelectorComponent;

        selector.materialSelected.emit(CellType.Water);
        selector.objectSelected.emit(ItemType.Flag);

        expect(materialSpy).toHaveBeenCalledWith(CellType.Water);
        expect(objectSpy).toHaveBeenCalledWith(ItemType.Flag);
    });

    it('should compute object-related error states and aggregate error messages', () => {
        const validationCodesSignal = (
            gameEditFormServiceStub as unknown as {
                validationErrorCodes: ReturnType<typeof signal<readonly ErrorCode[]>>;
            }
        ).validationErrorCodes;

        (
            gameEditFormServiceStub as unknown as {
                validationErrorCodes: ReturnType<typeof signal<readonly ErrorCode[]>>;
            }
        ).validationErrorCodes.set([ErrorCode.BoardInvalidSpawnCount, ErrorCode.BoardMissingFlag]);

        // Nominal case: both spawn and flag errors are active.
        expect((component as unknown as { hasSpawnPointError: () => boolean }).hasSpawnPointError()).toBeTrue();
        expect((component as unknown as { hasFlagError: () => boolean }).hasFlagError()).toBeTrue();
        expect((component as unknown as { spawnPointErrorMessage: () => string }).spawnPointErrorMessage()).toBe(
            getErrorMessage(ErrorCode.BoardInvalidSpawnCount),
        );
        expect((component as unknown as { flagErrorMessage: () => string }).flagErrorMessage()).toBe(getErrorMessage(ErrorCode.BoardMissingFlag));
        expect((component as unknown as { objectErrorMessages: () => readonly string[] }).objectErrorMessages()).toEqual([
            getErrorMessage(ErrorCode.BoardInvalidSpawnCount),
            getErrorMessage(ErrorCode.BoardMissingFlag),
        ]);

        (boardEditorServiceStub as unknown as { gameMode: GameType }).gameMode = GameType.Classic;
        validationCodesSignal.set([ErrorCode.BoardInvalidSpawnCount, ErrorCode.BoardMissingFlag]);
        fixture.detectChanges();
        expect((component as unknown as { hasFlagError: () => boolean }).hasFlagError()).toBeFalse();

        remainingObjectCountSpy.and.returnValue(0);
        validationCodesSignal.set([ErrorCode.BoardInvalidSpawnCount, ErrorCode.BoardMissingFlag]);
        fixture.detectChanges();
        expect((component as unknown as { hasSpawnPointError: () => boolean }).hasSpawnPointError()).toBeFalse();

        // Edge case: no validation errors should yield no messages.
        validationCodesSignal.set([]);
        expect((component as unknown as { objectErrorMessages: () => readonly string[] }).objectErrorMessages()).toEqual([]);
    });

    it('should compute tool button class from active tool', () => {
        expect(component['toolButtonClass'](ToolOption.Placement)).toBe('btn btn-blue');

        (boardEditorServiceStub as unknown as { activeTool: ToolOption }).activeTool = ToolOption.Objects;
        expect(component['toolButtonClass'](ToolOption.Placement)).toBe('btn');
    });
});
