import { TooltipPositionOptions } from '@app/interfaces/tooltip-position-options.interface';
import { TooltipPosition } from '@app/interfaces/tooltip-position.interface';

export type { TooltipPosition };

export function computeTooltipPosition({
    event,
    containerRect,
    tooltipWidth,
    tooltipHeight,
    horizontalOffsetPx,
    verticalOffsetPx,
    fallbackPosition,
}: TooltipPositionOptions): TooltipPosition {
    const boundsWidth = containerRect?.width && containerRect.width > 0 ? containerRect.width : window.innerWidth;
    const boundsHeight = containerRect?.height && containerRect.height > 0 ? containerRect.height : window.innerHeight;
    const boundsLeft = containerRect?.left ?? 0;
    const boundsTop = containerRect?.top ?? 0;

    if (boundsWidth <= 0 || boundsHeight <= 0) {
        return fallbackPosition;
    }

    const relativeCursorX = event.clientX - boundsLeft;
    const relativeCursorY = event.clientY - boundsTop;
    const maxLeft = Math.max(0, boundsWidth - tooltipWidth);
    const maxTop = Math.max(0, boundsHeight - tooltipHeight);

    const x = resolveAxisPosition(relativeCursorX, tooltipWidth, boundsWidth, horizontalOffsetPx);
    const y = resolveAxisPosition(relativeCursorY, tooltipHeight, boundsHeight, verticalOffsetPx);

    return {
        x: clamp(x, 0, maxLeft),
        y: clamp(y, 0, maxTop),
    };
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function resolveAxisPosition(cursorPosition: number, tooltipSize: number, boundsSize: number, offset: number): number {
    const forwardPosition = cursorPosition + offset;
    const backwardPosition = cursorPosition - offset - tooltipSize;

    if (forwardPosition + tooltipSize <= boundsSize) {
        return forwardPosition;
    }

    if (backwardPosition >= 0) {
        return backwardPosition;
    }

    return clamp(forwardPosition, 0, Math.max(0, boundsSize - tooltipSize));
}
