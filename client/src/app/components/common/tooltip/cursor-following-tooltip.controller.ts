import { signal } from '@angular/core';
import {
    TOOLTIP_CONTROLLER_FALLBACK_HEIGHT_PX,
    TOOLTIP_CONTROLLER_FALLBACK_WIDTH_PX,
    TOOLTIP_CONTROLLER_VERTICAL_OFFSET_PX,
} from '@app/constants/tooltip';
import { CursorFollowingTooltipDependencies, TooltipPointer, TooltipPosition } from '@app/interfaces/cursor-following-tooltip.interface';

export type { CursorFollowingTooltipDependencies, TooltipPosition };

export class CursorFollowingTooltipController {
    readonly tooltipPointer = signal<TooltipPointer | null>(null);
    readonly tooltipPosition = signal<TooltipPosition>({ x: 0, y: 0 });

    constructor(private readonly dependencies: CursorFollowingTooltipDependencies) {}

    setPointer(clientX: number, clientY: number): void {
        this.tooltipPointer.set({ x: clientX, y: clientY });
    }

    clearPointer(): void {
        this.tooltipPointer.set(null);
    }

    syncTooltipPosition(hasTooltip: boolean): void {
        const tooltipPointer = this.tooltipPointer();

        if (!hasTooltip || !tooltipPointer) {
            return;
        }

        this.updateTooltipPosition(tooltipPointer.x, tooltipPointer.y);
    }

    private updateTooltipPosition(clientX: number, clientY: number): void {
        const container = this.dependencies.getContainer();
        const tooltip = this.dependencies.getTooltipElement();

        const tooltipRect = tooltip?.getBoundingClientRect();
        const tooltipWidth = tooltipRect?.width ?? TOOLTIP_CONTROLLER_FALLBACK_WIDTH_PX;
        const tooltipHeight = tooltipRect?.height ?? TOOLTIP_CONTROLLER_FALLBACK_HEIGHT_PX;

        let cursorX: number;
        let cursorY: number;
        let containerWidth: number;
        let containerHeight: number;

        if (container) {
            const containerRect = container.getBoundingClientRect();
            cursorX = clientX - containerRect.left;
            cursorY = clientY - containerRect.top;
            containerWidth = containerRect.width;
            containerHeight = containerRect.height;
        } else {
            cursorX = clientX;
            cursorY = clientY;
            containerWidth = window.innerWidth;
            containerHeight = window.innerHeight;
        }

        const x = Math.min(Math.max(cursorX, tooltipWidth / 2), Math.max(tooltipWidth / 2, containerWidth - tooltipWidth / 2));
        let y = cursorY - tooltipHeight - TOOLTIP_CONTROLLER_VERTICAL_OFFSET_PX;

        if (y < 0) {
            y = cursorY + TOOLTIP_CONTROLLER_VERTICAL_OFFSET_PX;
        }

        y = Math.max(0, Math.min(y, containerHeight - tooltipHeight));

        const nextPosition = { x, y };
        const currentPosition = this.tooltipPosition();

        if (currentPosition.x === nextPosition.x && currentPosition.y === nextPosition.y) {
            return;
        }

        this.tooltipPosition.set(nextPosition);
    }
}
