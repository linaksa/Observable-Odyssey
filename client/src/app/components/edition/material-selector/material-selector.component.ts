import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CELL_TYPE_PATHS } from '@app/constants/backgrounds-mapping';
import { BoardEditorService } from '@app/services/editor/edition.service';
import { CellType } from '@common/board';

@Component({
    selector: 'app-edition-item-selector-material',
    templateUrl: './material-selector.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'flex grow flex-col items-center gap-2',
    },
})
export class EditionItemSelectorMaterialComponent {
    protected readonly boardEditorService = inject(BoardEditorService);
    protected readonly cellImagePath = (cellType: CellType): string => CELL_TYPE_PATHS[cellType];

    readonly materialSelected = output<CellType>();

    protected selectMaterial(type: CellType): void {
        this.materialSelected.emit(type);
    }

    protected cellDescription(type: CellType): string {
        return this.boardEditorService.cellTypesInfo[type].description;
    }

    protected materialButtonClass(type: CellType): string {
        return this.joinClasses(
            'relative w-16 h-auto aspect-square rounded-full overflow-hidden focus-visible:ring-2 focus-visible:ring-blue-400',
            this.boardEditorService.selectedMaterial === type ? 'outline-4 outline-blue-600' : 'outline-none',
        );
    }

    protected displayTitle(title: string): string {
        return title.replace(/ :$/, '');
    }

    private joinClasses(...classes: (string | false | null | undefined)[]): string {
        return classes.filter(Boolean).join(' ');
    }
}
