import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { EditorItemSelectorMaterialComponent } from '@app/components/editor/material-selector/material-selector.component';
import { EditorItemSelectorObjectComponent } from '@app/components/editor/object-selector/object-selector.component';
import { ToolOption } from '@app/constants/grid-editor';
import { BoardEditorService } from '@app/services/editor/editor.service';
import { CellType } from '@common/board';
import { ItemType } from '@common/items';

@Component({
    selector: 'app-editor-item-selector',
    imports: [EditorItemSelectorObjectComponent, EditorItemSelectorMaterialComponent],
    templateUrl: './editor-item-selector.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'flex w-full flex-col min-h-0',
    },
})
export class EditorItemSelectorComponent {
    protected readonly boardEditorService = inject(BoardEditorService);
    protected readonly toolOption = ToolOption;

    readonly materialSelected = output<CellType>();
    readonly objectSelected = output<ItemType>();
}
