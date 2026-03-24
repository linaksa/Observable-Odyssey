/**
 * Testing strategy — Edition Material Selector Component
 *
 * Approach:
 * - Render the standalone selector with a lightweight BoardEditorService stub.
 * - Verify the template reads labels, descriptions, and image paths from shared info.
 * - Exercise the click output so the parent component can react to selections.
 *
 * Edge cases covered:
 * - Selected and unselected button states should produce different classes.
 * - Shared titles with a trailing colon should be trimmed for display and alt text.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TILE_INFO_BY_TYPE } from '@app/constants/tile-info';
import { BoardEditorService } from '@app/services/editor/edition.service';
import { CellType } from '@common/board';
import { EditionItemSelectorMaterialComponent } from './material-selector.component';

describe('EditionItemSelectorMaterialComponent', () => {
    let component: EditionItemSelectorMaterialComponent;
    let fixture: ComponentFixture<EditionItemSelectorMaterialComponent>;
    let boardEditorServiceStub: BoardEditorService;

    beforeEach(async () => {
        boardEditorServiceStub = {
            availableCellTypes: [CellType.Empty, CellType.Ice, CellType.Water],
            cellTypesInfo: TILE_INFO_BY_TYPE,
            selectedMaterial: CellType.Ice,
        } as unknown as BoardEditorService;

        await TestBed.configureTestingModule({
            imports: [EditionItemSelectorMaterialComponent],
            providers: [{ provide: BoardEditorService, useValue: boardEditorServiceStub }],
        }).compileComponents();

        fixture = TestBed.createComponent(EditionItemSelectorMaterialComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should render shared tile labels and emit selections from clicks', () => {
        const buttons = fixture.nativeElement.querySelectorAll('button[title]') as NodeListOf<HTMLButtonElement>;
        const title = fixture.nativeElement.querySelector('span.text-white.tracking-widest') as HTMLElement;
        const selectedMaterialIndex = boardEditorServiceStub.availableCellTypes.indexOf(CellType.Ice);
        const emitted: CellType[] = [];

        component.materialSelected.subscribe((material) => emitted.push(material));

        expect(buttons.length).toBe(boardEditorServiceStub.availableCellTypes.length);
        expect(title.textContent?.trim()).toBe('Glace');
        expect(buttons[selectedMaterialIndex].getAttribute('title')).toBe(TILE_INFO_BY_TYPE[CellType.Ice].description);
        expect((buttons[selectedMaterialIndex].querySelector('img') as HTMLImageElement).alt).toBe('Glace');

        buttons[selectedMaterialIndex].click();

        expect(emitted).toEqual([CellType.Ice]);
    });

    it('should derive classes and descriptions from the shared tile info', () => {
        const componentApi = component as unknown as {
            cellDescription(type: CellType): string;
            displayTitle(title: string): string;
            materialButtonClass(type: CellType): string;
        };

        expect(componentApi.cellDescription(CellType.Water)).toBe(TILE_INFO_BY_TYPE[CellType.Water].description);
        expect(componentApi.displayTitle(TILE_INFO_BY_TYPE[CellType.Empty].title)).toBe('Tuile de base');
        expect(componentApi.materialButtonClass(CellType.Ice)).toContain('outline-4 outline-blue-600');
        expect(componentApi.materialButtonClass(CellType.Empty)).toContain('outline-none');
    });
});
