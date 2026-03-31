import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { ITEM_TYPE_PATHS } from '@app/constants/backgrounds-mapping';
import { BoardEditorService } from '@app/services/editor/edition.service';
import { ItemType } from '@common/items';

@Component({
    selector: 'app-edition-item-selector-object',
    templateUrl: './object-selector.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'flex grow flex-col items-center gap-2',
    },
})
export class EditionItemSelectorObjectComponent {
    protected readonly boardEditorService = inject(BoardEditorService);
    protected readonly objectImagePath = (itemType: ItemType): string => ITEM_TYPE_PATHS[itemType];

    readonly objectSelected = output<ItemType>();

    protected selectObject(type: ItemType): void {
        this.objectSelected.emit(type);
    }

    protected objectDescription(type: ItemType): string {
        return this.boardEditorService.itemTypesInfo[type].description;
    }

    protected displayTitle(title: string): string {
        return title.replace(/ :$/, '');
    }

    protected objectButtonClass(type: ItemType): string {
        return this.joinClasses(
            'relative w-16 h-auto aspect-square rounded-full overflow-hidden focus-visible:ring-2 focus-visible:ring-blue-400',
            this.boardEditorService.selectedObject === type
                ? 'outline-4 outline-blue-600'
                : this.boardEditorService.getRemainingObjectCount(type) !== 0
                  ? 'outline-2 outline-red-600'
                  : 'outline-none',
        );
    }

    private joinClasses(...classes: (string | false | null | undefined)[]): string {
        return classes.filter(Boolean).join(' ');
    }
}
