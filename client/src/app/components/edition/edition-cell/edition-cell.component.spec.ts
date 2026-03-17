/**
 * Testing strategy — EditionCellComponent
 *
 * Approach: Angular component tests with ComponentFixture.
 * Inputs are set via fixture.componentRef.setInput() to trigger
 * change detection and verify computed styles and DOM rendering.
 * Dummy objects representing different item types cover rendering cases
 * with and without a positioned object.
 *
 * Edge cases covered:
 * - Null item: no object style or #item element should appear in the DOM;
 *   backgroundImageForObject and objectExtraStyles should return empty values.
 * - Cell outside the sanctuary bounds (rowIndex/colIndex at 0,0): image positioning styles should not be applied.
 * - Each corner of a 2×2 sanctuary (top-left, top-right, bottom-left, bottom-right):
 *   verifies background-position is calculated correctly for each quadrant, covering all edge combinations.
 * - Mouse events (mousedown, mouseenter): verifies output EventEmitters are triggered by native DOM events.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CELL_TYPE_BACKGROUNDS, OBJECT_IMAGES } from '@app/constants/backgrounds-mapping';
import { CellType } from '@common/board';
import { IItem, ItemType } from '@common/items';
import { EditionCellComponent } from './edition-cell.component';

describe('EditionCellComponent', () => {
    let component: EditionCellComponent;
    let fixture: ComponentFixture<EditionCellComponent>;

    const dummyCell: CellType = CellType.Empty;

    const dummySanctuaryItem: IItem = {
        itemType: ItemType.LifeSanctuary,
        x: 2,
        y: 3,
        size: 2,
    };

    const dummySpawnPointItem: IItem = {
        itemType: ItemType.StartingPosition,
        x: 1,
        y: 1,
        size: 1,
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EditionCellComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(EditionCellComponent);
        component = fixture.componentInstance;
        component.cellType = dummyCell;
        component.rowIndex = 0;
        component.colIndex = 0;
        component.item = null;

        await fixture.whenStable();
    });

    it('should style correctly top left corner of sanctuary', () => {
        fixture.componentRef.setInput('rowIndex', dummySanctuaryItem.x);
        fixture.componentRef.setInput('colIndex', dummySanctuaryItem.y);
        fixture.componentRef.setInput('item', dummySanctuaryItem);
        fixture.detectChanges();

        expect(component.objectExtraStyles['background-position']).toBe('0% 0%');
    });

    it('should style correctly top right corner of sanctuary', () => {
        fixture.componentRef.setInput('rowIndex', dummySanctuaryItem.x);
        fixture.componentRef.setInput('colIndex', dummySanctuaryItem.y + 1);
        fixture.componentRef.setInput('item', dummySanctuaryItem);
        fixture.detectChanges();

        expect(component.objectExtraStyles['background-position']).toBe('100% 0%');
    });

    it('should style correctly bottom left corner of sanctuary', () => {
        fixture.componentRef.setInput('rowIndex', dummySanctuaryItem.x + 1);
        fixture.componentRef.setInput('colIndex', dummySanctuaryItem.y);
        fixture.componentRef.setInput('item', dummySanctuaryItem);
        fixture.detectChanges();

        expect(component.objectExtraStyles['background-position']).toBe('0% 100%');
    });

    it('should style correctly bottom right corner of sanctuary', () => {
        fixture.componentRef.setInput('rowIndex', dummySanctuaryItem.x + 1);
        fixture.componentRef.setInput('colIndex', dummySanctuaryItem.y + 1);
        fixture.componentRef.setInput('item', dummySanctuaryItem);
        fixture.detectChanges();

        expect(component.objectExtraStyles['background-position']).toBe('100% 100%');
    });

    // Edge case: should not style if indexes are outside sanctuary.
    it('should not style if indexes are outside sanctuary', () => {
        fixture.componentRef.setInput('rowIndex', 0);
        fixture.componentRef.setInput('colIndex', 0);
        fixture.componentRef.setInput('item', dummySanctuaryItem);
        fixture.detectChanges();

        expect(component.objectExtraStyles['background-position']).toBe('');
    });

    // Edge case: should render empty cell correctly.
    it('should render empty cell correctly', () => {
        fixture.componentRef.setInput('rowIndex', 0);
        fixture.componentRef.setInput('colIndex', 0);
        fixture.componentRef.setInput('item', null);
        fixture.detectChanges();

        const cellDiv = fixture.nativeElement.querySelector('#cell');
        expect(cellDiv).toBeTruthy();
        expect(cellDiv.className).toContain(CELL_TYPE_BACKGROUNDS[dummyCell]);

        const itemDiv = fixture.nativeElement.querySelector('#item');
        expect(itemDiv).toBeNull();
    });

    // Edge case: should return no object background when item is null.
    it('should return no object background when item is null', () => {
        fixture.componentRef.setInput('item', null);
        fixture.detectChanges();

        expect(component.backgroundImageForObject).toBe('');
    });

    // Edge case: should return empty extra object styles when item is null.
    it('should return empty extra object styles when item is null', () => {
        fixture.componentRef.setInput('item', null);
        fixture.detectChanges();

        expect(component.objectExtraStyles).toEqual({});
    });

    it('should render cell with object correctly', () => {
        fixture.componentRef.setInput('rowIndex', dummySpawnPointItem.x);
        fixture.componentRef.setInput('colIndex', dummySpawnPointItem.y);
        fixture.componentRef.setInput('item', dummySpawnPointItem);

        fixture.detectChanges();

        const itemDiv = fixture.nativeElement.querySelector('#item');
        expect(itemDiv).toBeTruthy();
        expect(itemDiv.className).toContain(OBJECT_IMAGES[dummySpawnPointItem.itemType as ItemType]);
    });

    it('should emit output mouseDown events on mouseDowm', () => {
        spyOn(component.mousedDownCell, 'emit');
        fixture.detectChanges();

        const cellWrapper: HTMLElement = fixture.nativeElement.querySelector('#cell-wrapper');
        cellWrapper.dispatchEvent(new MouseEvent('mousedown'));
        expect(component.mousedDownCell.emit).toHaveBeenCalled();
    });

    it('should emit output mouse events on mouseDowm', () => {
        spyOn(component.mouseEnterCell, 'emit');
        fixture.detectChanges();

        const cellWrapper: HTMLElement = fixture.nativeElement.querySelector('#cell-wrapper');
        cellWrapper.dispatchEvent(new MouseEvent('mouseenter'));
        expect(component.mouseEnterCell.emit).toHaveBeenCalled();
    });
});
