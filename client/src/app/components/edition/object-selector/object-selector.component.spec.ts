/**
 * Testing strategy — Edition Object Selector Component
 *
 * Approach:
 * - Render the standalone selector with a lightweight BoardEditorService stub.
 * - Verify the template reads shared item metadata for titles, descriptions, and counts.
 * - Exercise the click output so the parent component can react to selections.
 *
 * Edge cases covered:
 * - Selected, remaining, and exhausted object states should produce distinct classes.
 * - Shared titles with a trailing colon should be trimmed for display and alt text.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ITEM_INFO_BY_TYPE } from '@app/constants/tile-info';
import { BoardEditorService } from '@app/services/editor/edition.service';
import { ItemType } from '@common/items';
import { EditionItemSelectorObjectComponent } from './object-selector.component';

describe('EditionItemSelectorObjectComponent', () => {
    let component: EditionItemSelectorObjectComponent;
    let fixture: ComponentFixture<EditionItemSelectorObjectComponent>;
    let boardEditorServiceStub: BoardEditorService;

    beforeEach(async () => {
        const availableObjectTypes = [ItemType.Flag, ItemType.LifeSanctuary, ItemType.FightSanctuary, ItemType.StartingPosition];

        boardEditorServiceStub = {
            availableObjectTypes: () => availableObjectTypes,
            getRemainingObjectCount: (type: ItemType) => {
                if (type === ItemType.FightSanctuary) {
                    return 0;
                }

                if (type === ItemType.LifeSanctuary) {
                    return 2;
                }

                if (type === ItemType.Flag) {
                    return 1;
                }

                return 1;
            },
            itemTypesInfo: ITEM_INFO_BY_TYPE,
            selectedObject: ItemType.Flag,
        } as unknown as BoardEditorService;

        await TestBed.configureTestingModule({
            imports: [EditionItemSelectorObjectComponent],
            providers: [{ provide: BoardEditorService, useValue: boardEditorServiceStub }],
        }).compileComponents();

        fixture = TestBed.createComponent(EditionItemSelectorObjectComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should render shared item labels and emit selections from clicks', () => {
        const buttons = fixture.nativeElement.querySelectorAll('button[title]') as NodeListOf<HTMLButtonElement>;
        const title = fixture.nativeElement.querySelector('span.text-white.tracking-widest') as HTMLElement;
        const availableObjectTypes = boardEditorServiceStub.availableObjectTypes();
        const flagIndex = availableObjectTypes.indexOf(ItemType.Flag);
        const startingPositionIndex = availableObjectTypes.indexOf(ItemType.StartingPosition);
        const emitted: ItemType[] = [];

        component.objectSelected.subscribe((itemType) => emitted.push(itemType));

        expect(title.textContent).toContain('Drapeau');
        expect(title.textContent).toContain('(1 restants)');
        expect(buttons.length).toBe(availableObjectTypes.length);
        expect(buttons[availableObjectTypes.indexOf(ItemType.LifeSanctuary)].getAttribute('title')).toBe(
            ITEM_INFO_BY_TYPE[ItemType.LifeSanctuary].description,
        );
        expect((buttons[flagIndex].querySelector('img') as HTMLImageElement).alt).toBe('Drapeau');
        expect((buttons[flagIndex].querySelector('img') as HTMLImageElement).className).toContain('[image-rendering:pixelated]');
        expect((fixture.nativeElement.querySelector('div.w-64.h-64 img') as HTMLImageElement).className).toContain('[image-rendering:pixelated]');

        buttons[startingPositionIndex].click();

        expect(emitted).toEqual([ItemType.StartingPosition]);
    });

    it('should derive classes and descriptions from the shared item info', () => {
        const componentApi = component as unknown as {
            displayTitle(title: string): string;
            objectButtonClass(type: ItemType): string;
            objectDescription(type: ItemType): string;
        };

        expect(componentApi.displayTitle(ITEM_INFO_BY_TYPE[ItemType.StartingPosition].title)).toBe('Position de depart');
        expect(componentApi.objectDescription(ItemType.Flag)).toBe(ITEM_INFO_BY_TYPE[ItemType.Flag].description);
        expect(componentApi.objectButtonClass(ItemType.Flag)).toContain('outline-4 outline-blue-600');
        expect(componentApi.objectButtonClass(ItemType.LifeSanctuary)).toContain('outline-2 outline-red-600');
        expect(componentApi.objectButtonClass(ItemType.FightSanctuary)).toContain('outline-none');
    });
});
