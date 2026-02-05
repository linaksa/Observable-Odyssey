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
    })
      .compileComponents();

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

    expect(component.getSanctuaryBgPosition(component.rowIndex, component.colIndex, dummySanctuaryItem)).toBe('0% 0%');
  });

  it('should style correctly top right corner of sanctuary', () => {
    fixture.componentRef.setInput('rowIndex', dummySanctuaryItem.x);
    fixture.componentRef.setInput('colIndex', dummySanctuaryItem.y + 1);
    fixture.componentRef.setInput('item', dummySanctuaryItem);
    fixture.detectChanges();

    expect(component.getSanctuaryBgPosition(component.rowIndex, component.colIndex, component.item as IItem)).toBe('100% 0%');
  });

  it('should style correctly bottom left corner of sanctuary', () => {
    fixture.componentRef.setInput('rowIndex', dummySanctuaryItem.x + 1);
    fixture.componentRef.setInput('colIndex', dummySanctuaryItem.y);
    fixture.componentRef.setInput('item', dummySanctuaryItem);
    fixture.detectChanges();

    expect(component.getSanctuaryBgPosition(component.rowIndex, component.colIndex, component.item as IItem)).toBe('0% 100%');
  });

  it('should style correctly bottom right corner of sanctuary', () => {
    fixture.componentRef.setInput('rowIndex', dummySanctuaryItem.x + 1);
    fixture.componentRef.setInput('colIndex', dummySanctuaryItem.y + 1);
    fixture.componentRef.setInput('item', dummySanctuaryItem);
    fixture.detectChanges();

    expect(component.getSanctuaryBgPosition(component.rowIndex, component.colIndex, component.item as IItem)).toBe('100% 100%');
  });

  it('should not style if indexes are outside sanctuary', () => {
    fixture.componentRef.setInput('rowIndex', 0);
    fixture.componentRef.setInput('colIndex', 0);
    fixture.componentRef.setInput('item', dummySanctuaryItem);
    fixture.detectChanges();

    expect(component.getSanctuaryBgPosition(component.rowIndex, component.colIndex, component.item as IItem)).toBe('');
  });

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

  it('should return no object background when item is null', () => {
    fixture.componentRef.setInput('item', null);
    fixture.detectChanges();

    expect(component.backgroundImageForObject).toBe('');
  });

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
