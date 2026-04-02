import { afterEveryRender, ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, output } from '@angular/core';
import { CursorFollowingTooltipController } from '@app/components/common/tooltip/cursor-following-tooltip.controller';
import { CELL_TYPE_PATHS, ITEM_TYPE_PATHS } from '@app/constants/backgrounds-mapping';
import { BoardEditorService } from '@app/services/editor/edition.service';
import { CellType } from '@common/board';
import { ItemType } from '@common/items';

type SanctuaryPreviewTilePosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const SANCTUARY_PREVIEW_TILE_POSITIONS: readonly SanctuaryPreviewTilePosition[] = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

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
    protected readonly tileImagePath = CELL_TYPE_PATHS[CellType.Empty];
    protected readonly objectImagePath = (itemType: ItemType): string => ITEM_TYPE_PATHS[itemType];
    protected readonly sanctuaryPreviewTiles = SANCTUARY_PREVIEW_TILE_POSITIONS;
    protected readonly selectedObjectPreviewClass = 'absolute inset-0 z-10 h-full w-full object-cover object-top [image-rendering:pixelated]';
    protected readonly selectedObjectIsSanctuary = computed(() => {
        const selectedObject = this.boardEditorService.selectedObject;
        return selectedObject === ItemType.LifeSanctuary || selectedObject === ItemType.FightSanctuary;
    });
    protected hoveredObject: ItemType | null = null;

    readonly objectSelected = output<ItemType>();

    private readonly tooltipController = new CursorFollowingTooltipController({
        getContainer: () => null,
        getTooltipElement: () => this.tooltipElementRef?.nativeElement ?? null,
    });
    protected readonly tooltipPosition = this.tooltipController.tooltipPosition;

    @ViewChild('tooltipElement', { read: ElementRef })
    private tooltipElementRef?: ElementRef<HTMLDivElement>;

    constructor() {
        afterEveryRender({
            read: () => this.tooltipController.syncTooltipPosition(this.hoveredObject !== null),
        });
    }

    protected selectObject(type: ItemType): void {
        this.objectSelected.emit(type);
    }

    protected showTooltip(type: ItemType, event: MouseEvent | FocusEvent): void {
        this.hoveredObject = type;
        this.setTooltipPointerFromEvent(event);
    }

    protected onTooltipMouseMove(event: MouseEvent): void {
        if (this.hoveredObject === null) {
            return;
        }

        this.tooltipController.setPointer(event.clientX, event.clientY);
    }

    protected hideTooltip(): void {
        this.hoveredObject = null;
        this.tooltipController.clearPointer();
    }

    protected objectDescription(type: ItemType): string {
        const info = this.boardEditorService.itemTypesInfo[type];
        const name = this.displayTitle(info.title);
        return `${name} - ${info.description}`;
    }

    protected tooltipTitle(type: ItemType): string {
        return this.displayTitle(this.boardEditorService.itemTypesInfo[type].title);
    }

    protected tooltipDescription(type: ItemType): string {
        return this.boardEditorService.itemTypesInfo[type].description;
    }

    protected remainingCountClass(type: ItemType | undefined = undefined): string {
        if (type === ItemType.StartingPosition && this.boardEditorService.getRemainingObjectCount(type) !== 0) {
            return 'text-red-500';
        }

        return 'text-white';
    }

    protected displayTitle(title: string): string {
        return title.replace(/ :$/, '');
    }

    protected sanctuaryPreviewTileClass(position: SanctuaryPreviewTilePosition): string {
        const baseClass = 'absolute h-1/2 w-1/2 object-cover object-top [image-rendering:pixelated]';

        switch (position) {
            case 'top-left':
                return `${baseClass} left-0 top-0`;
            case 'top-right':
                return `${baseClass} right-0 top-0`;
            case 'bottom-left':
                return `${baseClass} left-0 bottom-0`;
            case 'bottom-right':
                return `${baseClass} right-0 bottom-0`;
        }
    }

    protected objectButtonClass(type: ItemType): string {
        return this.joinClasses(
            'relative w-16 h-auto aspect-square rounded-full overflow-hidden focus-visible:ring-2 focus-visible:ring-blue-400',
            this.boardEditorService.selectedObject === type
                ? 'outline-4 outline-blue-600'
                : type === ItemType.StartingPosition && this.boardEditorService.getRemainingObjectCount(type) !== 0
                  ? 'outline-2 outline-red-600'
                  : 'outline-none',
        );
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
