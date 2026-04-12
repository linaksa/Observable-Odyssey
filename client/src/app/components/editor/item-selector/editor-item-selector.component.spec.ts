/**
 * Testing strategy — Editor Item Selector Component
 *
 * Approach:
 * - Render the switch between material and object selectors using a service stub.
 * - Verify the correct child component appears for each tool mode.
 * - Exercise the child outputs so the parent outputs stay covered.
 *
 * Edge cases covered:
 * - Switching tools should swap the visible child selector.
 * - Child outputs should bubble through the parent without mutation.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EditorItemSelectorMaterialComponent } from '@app/components/editor/material-selector/material-selector.component';
import { EditorItemSelectorObjectComponent } from '@app/components/editor/object-selector/object-selector.component';
import { ToolOption } from '@app/constants/grid-editor';
import { ITEM_INFO_BY_TYPE, TILE_INFO_BY_TYPE } from '@app/constants/tile-info';
import { BoardEditorService } from '@app/services/editor/editor.service';
import { CellType } from '@common/board';
import { ItemType } from '@common/items';
import { EditorItemSelectorComponent } from './editor-item-selector.component';

describe('EditorItemSelectorComponent', () => {
    let component: EditorItemSelectorComponent;
    let fixture: ComponentFixture<EditorItemSelectorComponent>;
    let boardEditorServiceStub: BoardEditorService;

    beforeEach(async () => {
        boardEditorServiceStub = {
            activeTool: ToolOption.Placement,
            availableCellTypes: [CellType.Empty, CellType.Ice],
            cellTypesInfo: TILE_INFO_BY_TYPE,
            getRemainingObjectCount: () => 1,
            itemTypesInfo: ITEM_INFO_BY_TYPE,
            selectedMaterial: CellType.Empty,
            selectedObject: null,
            availableObjectTypes: () => [ItemType.LifeSanctuary, ItemType.Flag],
        } as unknown as BoardEditorService;

        await TestBed.configureTestingModule({
            imports: [EditorItemSelectorComponent],
            providers: [{ provide: BoardEditorService, useValue: boardEditorServiceStub }],
        }).compileComponents();

        fixture = TestBed.createComponent(EditorItemSelectorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should render the material selector in placement mode and forward its output', () => {
        const materialSelectedSpy = jasmine.createSpy('materialSelected');
        component.materialSelected.subscribe(materialSelectedSpy);

        const materialSelector = fixture.debugElement.query(By.directive(EditorItemSelectorMaterialComponent));

        expect(materialSelector).toBeTruthy();
        expect(fixture.debugElement.query(By.directive(EditorItemSelectorObjectComponent))).toBeNull();

        (materialSelector.componentInstance as EditorItemSelectorMaterialComponent).materialSelected.emit(CellType.Ice);

        expect(materialSelectedSpy).toHaveBeenCalledWith(CellType.Ice);
    });

    it('should render the object selector in object mode and forward its output', () => {
        boardEditorServiceStub.activeTool = ToolOption.Objects;
        const objectFixture = TestBed.createComponent(EditorItemSelectorComponent);
        objectFixture.detectChanges();

        const objectSelectedSpy = jasmine.createSpy('objectSelected');
        const objectComponent = objectFixture.componentInstance;
        objectComponent.objectSelected.subscribe(objectSelectedSpy);

        const objectSelector = objectFixture.debugElement.query(By.directive(EditorItemSelectorObjectComponent));

        expect(objectSelector).toBeTruthy();
        expect(objectFixture.debugElement.query(By.directive(EditorItemSelectorMaterialComponent))).toBeNull();

        (objectSelector.componentInstance as EditorItemSelectorObjectComponent).objectSelected.emit(ItemType.Flag);

        expect(objectSelectedSpy).toHaveBeenCalledWith(ItemType.Flag);
    });
});
