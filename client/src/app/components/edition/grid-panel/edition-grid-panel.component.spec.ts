/**
 * Testing strategy — Edition Grid Panel Component
 *
 * Approach:
 * - Render the panel with a deterministic editor stub and the shared grid.
 * - Verify the panel exposes the grid element through its ViewChild helper.
 * - Exercise the forwarded grid events through the child GameGridComponent.
 *
 * Edge cases covered:
 * - The grid element helper should return null before the view is initialized.
 * - Mouse events should bubble through the panel without mutation.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { GameGridComponent, GameGridCellEvent } from '@app/components/common/game-grid/game-grid.component';
import { BoardEditorService } from '@app/services/editor/edition.service';
import { CellType } from '@common/board';
import { EditionGridPanelComponent } from './edition-grid-panel.component';

describe('EditionGridPanelComponent', () => {
    let component: EditionGridPanelComponent;
    let fixture: ComponentFixture<EditionGridPanelComponent>;
    let getObjectAtSpy: jasmine.Spy<(rowIndex: number, colIndex: number) => unknown>;
    let boardEditorServiceStub: BoardEditorService;

    beforeEach(async () => {
        getObjectAtSpy = jasmine.createSpy('getObjectAt').and.returnValue(null);
        boardEditorServiceStub = {
            gameCells: [[CellType.Empty]],
            getObjectAt: getObjectAtSpy,
        } as unknown as BoardEditorService;

        await TestBed.configureTestingModule({
            imports: [EditionGridPanelComponent],
            providers: [{ provide: BoardEditorService, useValue: boardEditorServiceStub }],
        }).compileComponents();

        fixture = TestBed.createComponent(EditionGridPanelComponent);
        component = fixture.componentInstance;
    });

    it('should return null before view init and the grid element afterward', () => {
        expect(component.getGridElement()).toBeNull();

        fixture.detectChanges();

        expect(component.getGridElement()).toBe(fixture.nativeElement.querySelector('app-game-grid'));
        expect(getObjectAtSpy).toHaveBeenCalledWith(0, 0);
    });

    it('should forward mouse events from the shared grid', () => {
        const mouseDownSpy = jasmine.createSpy('cellMouseDown');
        const mouseEnterSpy = jasmine.createSpy('cellMouseEnter');
        const event = createGridCellEvent();

        component.cellMouseDown.subscribe(mouseDownSpy);
        component.cellMouseEnter.subscribe(mouseEnterSpy);

        fixture.detectChanges();

        const grid = fixture.debugElement.query(By.directive(GameGridComponent)).componentInstance as GameGridComponent;

        grid.cellMouseDown.emit(event);
        grid.cellMouseEnter.emit(event);

        expect(mouseDownSpy).toHaveBeenCalledWith(event);
        expect(mouseEnterSpy).toHaveBeenCalledWith(event);
    });
});

function createGridCellEvent(): GameGridCellEvent {
    return {
        rowIndex: 0,
        colIndex: 0,
        cellType: CellType.Empty,
        item: null,
        event: new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    };
}
