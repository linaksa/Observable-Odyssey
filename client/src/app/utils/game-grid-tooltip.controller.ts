import { computed, signal } from '@angular/core';
import { GameGridTooltipDependencies, GameGridTooltipPointer, TooltipTarget } from '@app/interfaces/game-grid-tooltip.interface';
import { TooltipPosition } from '@app/interfaces/tooltip-position.interface';
import { CursorFollowingTooltipController } from '@app/utils/cursor-following-tooltip.controller';

export class GameGridTooltipController {
    readonly hoveredCell = signal<TooltipTarget | null>(null);
    readonly tooltipPointer: () => GameGridTooltipPointer | null;
    readonly tooltipText = computed(() => {
        const hoveredCell = this.hoveredCell();

        if (!hoveredCell || !this.dependencies.showTooltip()) {
            return null;
        }

        void this.dependencies.objects();

        const getTooltipText = this.dependencies.getTooltipText();

        if (!getTooltipText) {
            return null;
        }

        const cellType = this.dependencies.cells()[hoveredCell.rowIndex]?.[hoveredCell.colIndex];

        if (cellType === undefined) {
            return null;
        }

        const item = this.dependencies.getObjectAt()(hoveredCell.rowIndex, hoveredCell.colIndex);
        return getTooltipText(hoveredCell.rowIndex, hoveredCell.colIndex, cellType, item);
    });
    readonly tooltipLines = computed(() => this.tooltipText()?.split('\n') ?? []);
    private readonly cursorFollowingTooltipController: CursorFollowingTooltipController;
    readonly tooltipPosition: () => TooltipPosition;

    constructor(private readonly dependencies: GameGridTooltipDependencies) {
        this.cursorFollowingTooltipController = new CursorFollowingTooltipController({
            getContainer: this.dependencies.getGridContainer,
            getTooltipElement: this.dependencies.getTooltipElement,
        });
        this.tooltipPointer = this.cursorFollowingTooltipController.tooltipPointer;
        this.tooltipPosition = this.cursorFollowingTooltipController.tooltipPosition;
    }

    showCellTooltip(event: MouseEvent, rowIndex: number, colIndex: number): void {
        this.hoveredCell.set({ rowIndex, colIndex });
        this.cursorFollowingTooltipController.setPointer(event.clientX, event.clientY);
    }

    onCellMouseMove(event: MouseEvent): void {
        if (!this.hoveredCell()) {
            return;
        }

        this.cursorFollowingTooltipController.setPointer(event.clientX, event.clientY);
    }

    clearTooltip(): void {
        this.hoveredCell.set(null);
        this.cursorFollowingTooltipController.clearPointer();
    }

    syncTooltipPosition(): void {
        this.cursorFollowingTooltipController.syncTooltipPosition(Boolean(this.tooltipText()));
    }
}
