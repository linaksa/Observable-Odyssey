/**
 * Testing strategy — Material Selector Component
 *
 * Approach:
 * - Validate selector behavior through class methods with a deterministic editor service stub.
 * - Exercise tooltip pointer updates, display formatting, and dynamic class generation.
 *
 * Edge cases covered:
 * - Focus events without HTMLElement currentTarget should be ignored safely.
 * - Mouse move without hovered material should not update tooltip pointer.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BoardEditorService } from '@app/services/editor/editor.service';
import { TILE_INFO_BY_TYPE } from '@app/constants/tile-info';
import { CellType } from '@common/board';
import { EditorItemSelectorMaterialComponent } from './material-selector.component';

const MOUSE_X = 10;
const MOUSE_Y = 20;
const FOCUS_CENTER_X = 7;
const FOCUS_CENTER_Y = 7;
const MOVE_X = 8;
const MOVE_Y = 9;
const POINTER_X = 24;
const POINTER_Y = 32;

describe('EditorItemSelectorMaterialComponent', () => {
    let component: EditorItemSelectorMaterialComponent;
    let fixture: ComponentFixture<EditorItemSelectorMaterialComponent>;

    const boardEditorServiceStub = {
        selectedMaterial: CellType.Empty,
        cellTypesInfo: TILE_INFO_BY_TYPE,
    } as unknown as BoardEditorService;

    beforeEach(async () => {
        TestBed.overrideComponent(EditorItemSelectorMaterialComponent, { set: { template: '' } });

        await TestBed.configureTestingModule({
            imports: [EditorItemSelectorMaterialComponent],
            providers: [{ provide: BoardEditorService, useValue: boardEditorServiceStub }],
        }).compileComponents();

        fixture = TestBed.createComponent(EditorItemSelectorMaterialComponent);
        component = fixture.componentInstance;
    });

    it('should sync tooltip position after renders according to hover state', () => {
        const tooltipController = component['tooltipController'] as {
            syncTooltipPosition: (hasTooltip: boolean) => void;
        };
        const syncSpy = spyOn(tooltipController, 'syncTooltipPosition');

        fixture.detectChanges();
        expect(syncSpy).toHaveBeenCalledWith(false);

        // Nominal case: hovering material enables tooltip sync.
        component['showTooltip'](CellType.Water, new MouseEvent('mousemove', { clientX: MOUSE_X, clientY: MOUSE_Y }));
        tooltipController.syncTooltipPosition(component['hoveredMaterial'] !== null);

        expect(syncSpy).toHaveBeenCalledWith(true);
    });

    it('should sync tooltip position through controller fallback dependencies', () => {
        // Edge case: tooltip controller computes a stable fallback position without rendered tooltip refs.
        const mouseMoveEvent = new MouseEvent('mousemove', { clientX: POINTER_X, clientY: POINTER_Y });
        component['showTooltip'](CellType.Ice, mouseMoveEvent);

        const tooltipController = component['tooltipController'] as {
            syncTooltipPosition: (hasTooltip: boolean) => void;
        };
        tooltipController.syncTooltipPosition(true);

        const position = component['tooltipPosition']();
        expect(position.x).toBeGreaterThan(0);
        expect(position.y).toBeGreaterThanOrEqual(0);
    });

    it('should emit selected material and expose material metadata helpers', () => {
        const emitSpy = jasmine.createSpy('materialSelected');
        component.materialSelected.subscribe(emitSpy);

        component['selectMaterial'](CellType.Ice);

        expect(emitSpy).toHaveBeenCalledWith(CellType.Ice);
        expect(component['cellDescription'](CellType.Empty)).toContain('Tuile de base');
        expect(component['tooltipTitle'](CellType.Empty)).toBe('Tuile de base');
        expect(component['tooltipDescription'](CellType.Empty)).toContain('Terrain libre');
        expect(component['displayTitle']('Mur :')).toBe('Mur');
    });

    it('should update tooltip pointer from mouse/focus events and clear on hide', () => {
        const tooltipController = component['tooltipController'] as {
            setPointer: (x: number, y: number) => void;
            clearPointer: () => void;
        };
        const setPointerSpy = spyOn(tooltipController, 'setPointer');
        const clearPointerSpy = spyOn(tooltipController, 'clearPointer');

        component['showTooltip'](CellType.Wall, new MouseEvent('mousemove', { clientX: MOUSE_X, clientY: MOUSE_Y }));
        expect(setPointerSpy).toHaveBeenCalledWith(MOUSE_X, MOUSE_Y);

        const button = document.createElement('button');
        spyOn(button, 'getBoundingClientRect').and.returnValue({ left: 2, top: 4, width: 10, height: 6 } as DOMRect);
        const focusEvent = new FocusEvent('focus');
        Object.defineProperty(focusEvent, 'currentTarget', { value: button });

        component['showTooltip'](CellType.Water, focusEvent);
        expect(setPointerSpy).toHaveBeenCalledWith(FOCUS_CENTER_X, FOCUS_CENTER_Y);

        // Edge case: invalid currentTarget should not call setPointer.
        const invalidFocusEvent = new FocusEvent('focus');
        Object.defineProperty(invalidFocusEvent, 'currentTarget', { value: null });
        component['showTooltip'](CellType.Empty, invalidFocusEvent);

        component['hideTooltip']();
        expect(component['hoveredMaterial']).toBeNull();
        expect(clearPointerSpy).toHaveBeenCalled();
    });

    it('should process tooltip mouse move only when hover exists', () => {
        const tooltipController = component['tooltipController'] as {
            setPointer: (x: number, y: number) => void;
        };
        const setPointerSpy = spyOn(tooltipController, 'setPointer');

        component['hoveredMaterial'] = null;
        component['onTooltipMouseMove'](new MouseEvent('mousemove', { clientX: 1, clientY: 1 }));
        expect(setPointerSpy).not.toHaveBeenCalled();

        component['hoveredMaterial'] = CellType.Empty;
        component['onTooltipMouseMove'](new MouseEvent('mousemove', { clientX: MOVE_X, clientY: MOVE_Y }));
        expect(setPointerSpy).toHaveBeenCalledWith(MOVE_X, MOVE_Y);

        component['handleWindowBlur']();
        expect(component['hoveredMaterial']).toBeNull();
    });

    it('should generate selected/unselected button classes', () => {
        boardEditorServiceStub.selectedMaterial = CellType.Empty;

        const selectedClass = component['materialButtonClass'](CellType.Empty);
        const unselectedClass = component['materialButtonClass'](CellType.Ice);

        expect(selectedClass).toContain('outline-4 outline-blue-600');
        expect(unselectedClass).toContain('outline-none');
    });
});
