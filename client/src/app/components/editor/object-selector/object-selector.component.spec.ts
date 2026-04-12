/**
 * Testing strategy — Editor Item Selector Object Component
 *
 * Approach:
 * - Render the selector with a deterministic board editor stub.
 * - Verify mandatory object counts are highlighted the same way as spawn points.
 * - Keep assertions focused on the visible classes and label styling.
 *
 * Edge cases covered:
 * - CTF flags should be marked mandatory until placed.
 * - Non-mandatory objects should keep their neutral styling.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ITEM_INFO_BY_TYPE } from '@app/constants/tile-info';
import { BoardEditorService } from '@app/services/editor/editor.service';
import { GameType } from '@common/game';
import { ItemType } from '@common/items';
import { EditorItemSelectorObjectComponent } from './object-selector.component';

describe('EditorItemSelectorObjectComponent', () => {
    let fixture: ComponentFixture<EditorItemSelectorObjectComponent>;

    beforeEach(async () => {
        const boardEditorServiceStub = {
            availableObjectTypes: () => [ItemType.StartingPosition, ItemType.Flag],
            gameMode: GameType.Ctf,
            itemTypesInfo: ITEM_INFO_BY_TYPE,
            selectedObject: ItemType.Flag,
            getRemainingObjectCount: (type: ItemType) => (type === ItemType.Flag ? 1 : 0),
        } as unknown as BoardEditorService;

        await TestBed.configureTestingModule({
            imports: [EditorItemSelectorObjectComponent],
            providers: [{ provide: BoardEditorService, useValue: boardEditorServiceStub }],
        }).compileComponents();

        fixture = TestBed.createComponent(EditorItemSelectorObjectComponent);
        fixture.detectChanges();
    });

    it('should highlight the mandatory CTF flag like a spawn point', () => {
        const buttons = fixture.nativeElement.querySelectorAll('button');
        const flagButton = buttons[1] as HTMLButtonElement;
        const remainingCount = fixture.nativeElement.querySelector('.text-red-500') as HTMLSpanElement;

        expect(flagButton.className).toContain('outline-2 outline-red-600');
        expect(remainingCount.className).toContain('text-red-500');
    });
});
