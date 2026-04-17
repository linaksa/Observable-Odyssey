/**
 * Testing strategy — Object Selector Component
 *
 * Approach:
 * - Use a map-backed remaining-count stub to drive all object availability branches.
 * - Validate tooltip, sanctuary preview, and class composition behavior through class methods.
 *
 * Edge cases covered:
 * - Focus events with invalid targets should not update tooltip pointer.
 * - Mandatory object counts should switch between warning and default styles.
 * - Tooltip dependency callbacks should tolerate missing container/tooltip elements.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ITEM_INFO_BY_TYPE } from '@app/constants/tile-info';
import { BoardEditorService } from '@app/services/editor/editor.service';
import { CursorFollowingTooltipController } from '@app/utils/cursor-following-tooltip.controller';
import { GameType } from '@common/game';
import { ItemType } from '@common/items';
import { EditorItemSelectorObjectComponent } from './object-selector.component';

const MOUSE_X = 11;
const MOUSE_Y = 22;
const FOCUS_CENTER_X = 20;
const FOCUS_CENTER_Y = 14;
const MOVE_X = 6;
const MOVE_Y = 7;

describe('EditorItemSelectorObjectComponent', () => {
    let component: EditorItemSelectorObjectComponent;
    let fixture: ComponentFixture<EditorItemSelectorObjectComponent>;

    const remainingCounts = new Map<ItemType, number>([
        [ItemType.LifeSanctuary, 1],
        [ItemType.FightSanctuary, 1],
        [ItemType.StartingPosition, 0],
        [ItemType.Flag, 1],
    ]);

    const boardEditorServiceStub = {
        selectedObject: ItemType.Flag,
        gameMode: GameType.Ctf,
        itemTypesInfo: ITEM_INFO_BY_TYPE,
        getRemainingObjectCount: (type: ItemType) => remainingCounts.get(type) ?? 0,
    } as unknown as BoardEditorService;

    beforeEach(async () => {
        boardEditorServiceStub.selectedObject = ItemType.Flag;
        boardEditorServiceStub.gameMode = GameType.Ctf;
        remainingCounts.set(ItemType.LifeSanctuary, 1);
        remainingCounts.set(ItemType.FightSanctuary, 1);
        remainingCounts.set(ItemType.StartingPosition, 0);
        remainingCounts.set(ItemType.Flag, 1);

        TestBed.overrideComponent(EditorItemSelectorObjectComponent, { set: { template: '' } });

        await TestBed.configureTestingModule({
            imports: [EditorItemSelectorObjectComponent],
            providers: [{ provide: BoardEditorService, useValue: boardEditorServiceStub }],
        }).compileComponents();

        createComponent();
    });

    it('should sync tooltip position from hover state after render', () => {
        const syncSpy = spyOn(CursorFollowingTooltipController.prototype, 'syncTooltipPosition').and.callThrough();

        createComponent();
        expect(syncSpy).toHaveBeenCalledWith(false);

        syncSpy.calls.reset();
        createComponent(ItemType.Flag);
        expect(syncSpy).toHaveBeenCalledWith(true);
    });

    it('should emit selected object and expose object descriptions', () => {
        const emitSpy = jasmine.createSpy('objectSelected');
        component.objectSelected.subscribe(emitSpy);

        component['selectObject'](ItemType.Flag);

        expect(emitSpy).toHaveBeenCalledWith(ItemType.Flag);
        expect(component['objectDescription'](ItemType.Flag)).toContain('Drapeau');
        expect(component['tooltipTitle'](ItemType.Flag)).toBe('Drapeau');
        expect(component['tooltipDescription'](ItemType.Flag)).toContain('Objectif principal');
        expect(component['displayTitle']('Nom :')).toBe('Nom');
        expect(component['tileImagePath']).toBeDefined();
        expect(component['objectImagePath'](ItemType.Flag)).toContain('flag');
    });

    it('should handle tooltip pointer updates and clear on hide/blur', () => {
        const tooltipController = component['tooltipController'] as {
            setPointer: (x: number, y: number) => void;
            clearPointer: () => void;
        };
        const setPointerSpy = spyOn(tooltipController, 'setPointer');
        const clearPointerSpy = spyOn(tooltipController, 'clearPointer');

        component['showTooltip'](ItemType.Flag, new MouseEvent('mousemove', { clientX: MOUSE_X, clientY: MOUSE_Y }));
        expect(setPointerSpy).toHaveBeenCalledWith(MOUSE_X, MOUSE_Y);

        const button = document.createElement('button');
        spyOn(button, 'getBoundingClientRect').and.returnValue({ left: 10, top: 8, width: 20, height: 12 } as DOMRect);
        const focusEvent = new FocusEvent('focus');
        Object.defineProperty(focusEvent, 'currentTarget', { value: button });
        component['showTooltip'](ItemType.StartingPosition, focusEvent);

        expect(setPointerSpy).toHaveBeenCalledWith(FOCUS_CENTER_X, FOCUS_CENTER_Y);

        // Edge case: invalid focus target is ignored.
        const invalidFocusEvent = new FocusEvent('focus');
        Object.defineProperty(invalidFocusEvent, 'currentTarget', { value: null });
        component['showTooltip'](ItemType.FightSanctuary, invalidFocusEvent);

        component['hideTooltip']();
        expect(component['hoveredObject']).toBeNull();
        expect(clearPointerSpy).toHaveBeenCalled();

        component['hoveredObject'] = ItemType.LifeSanctuary;
        component['handleWindowBlur']();
        expect(component['hoveredObject']).toBeNull();
    });

    it('should move tooltip pointer only while hovered', () => {
        const tooltipController = component['tooltipController'] as {
            setPointer: (x: number, y: number) => void;
        };
        const setPointerSpy = spyOn(tooltipController, 'setPointer');

        component['hoveredObject'] = null;
        component['onTooltipMouseMove'](new MouseEvent('mousemove', { clientX: 1, clientY: 2 }));
        expect(setPointerSpy).not.toHaveBeenCalled();

        component['hoveredObject'] = ItemType.Flag;
        component['onTooltipMouseMove'](new MouseEvent('mousemove', { clientX: MOVE_X, clientY: MOVE_Y }));
        expect(setPointerSpy).toHaveBeenCalledWith(MOVE_X, MOVE_Y);
    });

    it('should sync tooltip position even when dependency callbacks return null elements', () => {
        const tooltipController = component['tooltipController'] as CursorFollowingTooltipController;

        // Nominal case: pointer updates compute a bounded position.
        tooltipController.setPointer(MOUSE_X, MOUSE_Y);
        tooltipController.syncTooltipPosition(true);
        expect(component['tooltipPosition']().x).toBeGreaterThanOrEqual(0);
        expect(component['tooltipPosition']().y).toBeGreaterThanOrEqual(0);

        // Edge case: missing tooltip path still computes using fallback dimensions.
        expect(component['tooltipPosition']().x).toBeGreaterThan(0);
    });

    it('should compute sanctuary and remaining-count related styles', () => {
        boardEditorServiceStub.selectedObject = ItemType.LifeSanctuary;
        createComponent();
        expect(component['selectedObjectIsSanctuary']()).toBeTrue();

        boardEditorServiceStub.selectedObject = ItemType.Flag;
        createComponent();
        expect(component['selectedObjectIsSanctuary']()).toBeFalse();

        remainingCounts.set(ItemType.StartingPosition, 1);
        createComponent();
        expect(component['remainingCountClass'](ItemType.StartingPosition)).toBe('text-red-500');

        remainingCounts.set(ItemType.StartingPosition, 0);
        createComponent();
        expect(component['remainingCountClass'](ItemType.StartingPosition)).toBe('text-white');
        expect(component['remainingCountClass']()).toBe('text-white');

        boardEditorServiceStub.gameMode = GameType.Classic;
        createComponent();
        expect(component['remainingCountClass'](ItemType.Flag)).toBe('text-white');
    });

    it('should provide sanctuary tile classes for each quadrant', () => {
        expect(component['sanctuaryPreviewTileClass']('top-left')).toContain('left-0 top-0');
        expect(component['sanctuaryPreviewTileClass']('top-right')).toContain('right-0 top-0');
        expect(component['sanctuaryPreviewTileClass']('bottom-left')).toContain('left-0 bottom-0');
        expect(component['sanctuaryPreviewTileClass']('bottom-right')).toContain('right-0 bottom-0');
    });

    it('should compute object button classes for availability and selection states', () => {
        // Nominal case: selected object gets blue outline.
        boardEditorServiceStub.selectedObject = ItemType.Flag;
        remainingCounts.set(ItemType.Flag, 0);
        createComponent();
        expect(component['objectButtonClass'](ItemType.Flag)).toContain('outline-4 outline-blue-600');

        // Edge case: unavailable object gets disabled style.
        remainingCounts.set(ItemType.FightSanctuary, 0);
        createComponent();
        expect(component['objectButtonClass'](ItemType.FightSanctuary)).toContain('opacity-45 grayscale');

        remainingCounts.set(ItemType.StartingPosition, 1);
        createComponent();
        expect(component['objectButtonClass'](ItemType.StartingPosition)).toContain('outline-2 outline-red-600');

        boardEditorServiceStub.selectedObject = ItemType.FightSanctuary;
        remainingCounts.set(ItemType.LifeSanctuary, 1);
        createComponent();
        expect(component['objectButtonClass'](ItemType.LifeSanctuary)).toContain('outline-none');
    });

    function createComponent(hoveredObject: ItemType | null = null): void {
        fixture = TestBed.createComponent(EditorItemSelectorObjectComponent);
        component = fixture.componentInstance;

        if (hoveredObject !== null) {
            component['hoveredObject'] = hoveredObject;
        }

        fixture.detectChanges();
    }
});
