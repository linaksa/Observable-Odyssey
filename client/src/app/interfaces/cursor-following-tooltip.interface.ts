import { TooltipPosition } from '@app/interfaces/tooltip-position.interface';

export interface TooltipPointer {
    x: number;
    y: number;
}

export interface CursorFollowingTooltipDependencies {
    getContainer: () => HTMLElement | null;
    getTooltipElement: () => HTMLElement | null;
}

export type { TooltipPosition };
