import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { EditionItemSelectorMaterialComponent } from '@app/components/edition/material-selector/material-selector.component';
import { EditionItemSelectorObjectComponent } from '@app/components/edition/object-selector/object-selector.component';
import { ToolOption } from '@app/constants/grid-edition';
import { BoardEditorService } from '@app/services/editor/edition.service';
import { CellType } from '@common/board';
import { ItemType } from '@common/items';

@Component({
    selector: 'app-edition-item-selector',
    imports: [EditionItemSelectorObjectComponent, EditionItemSelectorMaterialComponent],
    templateUrl: './edition-item-selector.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'flex w-full flex-col min-h-0',
    },
})
export class EditionItemSelectorComponent {
    protected readonly boardEditorService = inject(BoardEditorService);
    protected readonly toolOption = ToolOption;

    readonly materialSelected = output<CellType>();
    readonly objectSelected = output<ItemType>();
}
