import { TooltipPosition } from '@app/interfaces/tooltip-position.interface';

export interface TooltipPositionOptions {
    event: MouseEvent;
    containerRect?: DOMRect;
    tooltipWidth: number;
    tooltipHeight: number;
    horizontalOffsetPx: number;
    verticalOffsetPx: number;
    fallbackPosition: TooltipPosition;
}
