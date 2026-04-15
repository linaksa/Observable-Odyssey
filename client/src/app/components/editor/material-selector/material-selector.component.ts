import { afterEveryRender, ChangeDetectionStrategy, Component, ElementRef, HostListener, inject, output, ViewChild } from '@angular/core';
import { CursorFollowingTooltipController } from '@app/components/common/tooltip/cursor-following-tooltip.controller';
import { CELL_TYPE_PATHS } from '@app/constants/backgrounds-mapping';
import { BoardEditorService } from '@app/services/editor/editor.service';
import { CellType } from '@common/board';

@Component({
    selector: 'app-editor-item-selector-material',
    templateUrl: './material-selector.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'flex grow flex-col items-center gap-2',
    },
})
export class EditorItemSelectorMaterialComponent {
    protected readonly boardEditorService = inject(BoardEditorService);
    protected readonly cellImagePath = (cellType: CellType): string => CELL_TYPE_PATHS[cellType];
    protected hoveredMaterial: CellType | null = null;

    readonly materialSelected = output<CellType>();

    private readonly tooltipController = new CursorFollowingTooltipController({
        getContainer: () => null,
        getTooltipElement: () => this.tooltipElementRef?.nativeElement ?? null,
    });
    protected readonly tooltipPosition = this.tooltipController.tooltipPosition;

    @ViewChild('tooltipElement', { read: ElementRef })
    private tooltipElementRef?: ElementRef<HTMLDivElement>;

    constructor() {
        afterEveryRender({
            read: () => this.tooltipController.syncTooltipPosition(this.hoveredMaterial !== null),
        });
    }

    @HostListener('window:blur')
    protected handleWindowBlur(): void {
        this.hideTooltip();
    }

    protected selectMaterial(type: CellType): void {
        this.materialSelected.emit(type);
    }

    protected showTooltip(type: CellType, event: MouseEvent | FocusEvent): void {
        this.hoveredMaterial = type;
        this.setTooltipPointerFromEvent(event);
    }

    protected onTooltipMouseMove(event: MouseEvent): void {
        if (this.hoveredMaterial === null) {
            return;
        }

        this.tooltipController.setPointer(event.clientX, event.clientY);
    }

    protected hideTooltip(): void {
        this.hoveredMaterial = null;
        this.tooltipController.clearPointer();
    }

    protected cellDescription(type: CellType): string {
        const info = this.boardEditorService.cellTypesInfo[type];
        const name = this.displayTitle(info.title);
        return `${name} - ${info.description}`;
    }

    protected tooltipTitle(type: CellType): string {
        return this.displayTitle(this.boardEditorService.cellTypesInfo[type].title);
    }

    protected tooltipDescription(type: CellType): string {
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

    private setTooltipPointerFromEvent(event: MouseEvent | FocusEvent): void {
        if (event instanceof MouseEvent) {
            this.tooltipController.setPointer(event.clientX, event.clientY);
            return;
        }

        const trigger = event.currentTarget;

        if (!(trigger instanceof HTMLElement)) {
            return;
        }

        const triggerRect = trigger.getBoundingClientRect();
        this.tooltipController.setPointer(triggerRect.left + triggerRect.width / 2, triggerRect.top + triggerRect.height / 2);
    }

    private joinClasses(...classes: (string | false | null | undefined)[]): string {
        return classes.filter(Boolean).join(' ');
    }
}
