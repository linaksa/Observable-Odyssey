import { ChangeDetectionStrategy, Component, input, output, inject } from '@angular/core';
import { ToolOption } from '@app/constants/grid-edition';
import { BoardEditorService } from '@app/services/editor/edition.service';
import { CellType } from '@common/board';
import { ItemType } from '@common/items';
import { EditionItemSelectorComponent } from '@app/components/edition/item-selector/edition-item-selector.component';

@Component({
    selector: 'app-edition-tool-panel',
    imports: [EditionItemSelectorComponent],
    templateUrl: './edition-tool-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'flex-1 min-w-0 min-h-0',
    },
})
export class EditionToolPanelComponent {
    protected readonly boardEditorService = inject(BoardEditorService);

    readonly toolDescriptions = input.required<Readonly<Record<ToolOption, string>>>();

    readonly toolSelected = output<ToolOption>();
    readonly materialSelected = output<CellType>();
    readonly objectSelected = output<ItemType>();
}
