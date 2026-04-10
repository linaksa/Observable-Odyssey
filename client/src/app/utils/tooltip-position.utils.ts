export type TooltipPosition = { x: number; y: number };

interface TooltipPositionOptions {
    event: MouseEvent;
    containerRect?: DOMRect;
    tooltipWidth: number;
    tooltipHeight: number;
    horizontalOffsetPx: number;
    verticalOffsetPx: number;
    fallbackPosition: TooltipPosition;
}

export function computeTooltipPosition({
    event,
    containerRect,
    tooltipWidth,
    tooltipHeight,
    horizontalOffsetPx,
    verticalOffsetPx,
    fallbackPosition,
}: TooltipPositionOptions): TooltipPosition {
    if (!containerRect || containerRect.width <= 0 || containerRect.height <= 0) {
        return fallbackPosition;
    }

    const relativeCursorX = event.clientX - containerRect.left;
    const relativeCursorY = event.clientY - containerRect.top;
    const maxLeft = Math.max(0, containerRect.width - tooltipWidth);
    const maxTop = Math.max(0, containerRect.height - tooltipHeight);

    return {
        x: clamp(relativeCursorX + horizontalOffsetPx, 0, maxLeft),
        y: clamp(relativeCursorY + verticalOffsetPx, 0, maxTop),
    };
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}
