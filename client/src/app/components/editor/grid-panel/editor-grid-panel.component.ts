import { ChangeDetectionStrategy, Component, ElementRef, ViewChild, computed, inject, output, signal } from '@angular/core';
import { GameGridCellEvent, GameGridComponent, PlacementPreview } from '@app/components/common/game-grid/game-grid.component';
import { ToolOption } from '@app/constants/grid-editor';
import { BoardEditorService } from '@app/services/editor/editor.service';
import { GameEditFormService } from '@app/services/forms/game-edit-form.service';
import { buildEditorTooltipText } from '@app/utils/editor-tooltip';
import { buildEditorValidationHighlightedTiles } from '@app/utils/editor-validation';
import { CellType } from '@common/board';
import { IItem } from '@common/items';

@Component({
    selector: 'app-editor-grid-panel',
    imports: [GameGridComponent],
    templateUrl: './editor-grid-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'flex-2 min-w-0 min-h-0',
    },
})
export class EditorGridPanelComponent {
    protected readonly boardEditorService = inject(BoardEditorService);
    protected readonly gameEditFormService = inject(GameEditFormService);
    protected readonly highlightedTileClass = 'tile-error';
    protected readonly highlightedTiles = computed(() =>
        buildEditorValidationHighlightedTiles(
            this.boardEditorService.gameCellsSignal(),
            this.boardEditorService.objectsSignal(),
            this.gameEditFormService.validationErrorCodes(),
        ),
    );

    protected readonly getTooltipText = (rowIndex: number, colIndex: number, cellType: CellType, item: IItem | null): string | null => {
        return buildEditorTooltipText(
            { cellType, item, rowIndex, colIndex },
            this.boardEditorService.gameCellsSignal(),
            this.boardEditorService.objectsSignal(),
            this.gameEditFormService.validationErrorCodes(),
        );
    };

    protected readonly placementPreview = computed<PlacementPreview | null>(() => {
        const activeTool = this.boardEditorService.activeTool;

        if (activeTool === ToolOption.Placement) {
            if (this.currentHoverRow() < 0 || this.currentHoverCol() < 0) {
                return null;
            }

            return {
                rowIndex: this.currentHoverRow(),
                colIndex: this.currentHoverCol(),
                cellType: this.boardEditorService.selectedMaterial,
            };
        }

        if (activeTool === ToolOption.Objects && this.boardEditorService.selectedObject) {
            if (this.currentHoverRow() < 0 || this.currentHoverCol() < 0) {
                return null;
            }

            if (!this.boardEditorService.isSelectedObjectPlacementPositionValid(this.currentHoverRow(), this.currentHoverCol())) {
                return null;
            }

            return {
                rowIndex: this.currentHoverRow(),
                colIndex: this.currentHoverCol(),
                itemType: this.boardEditorService.selectedObject,
            };
        }

        return null;
    });

    private readonly currentHoverRow = signal<number>(-1);
    private readonly currentHoverCol = signal<number>(-1);

    readonly cellMouseDown = output<GameGridCellEvent>();
    readonly cellMouseEnter = output<GameGridCellEvent>();

    @ViewChild('grid', { static: false, read: ElementRef })
    private grid?: ElementRef<HTMLElement>;

    getGridElement(): HTMLElement | null {
        return this.grid?.nativeElement ?? null;
    }

    onCellMouseEnter(event: GameGridCellEvent): void {
        this.currentHoverRow.set(event.rowIndex);
        this.currentHoverCol.set(event.colIndex);
        this.cellMouseEnter.emit(event);
    }

    onCellMouseLeave(): void {
        this.currentHoverRow.set(-1);
        this.currentHoverCol.set(-1);
    }
}
