export interface TooltipPointer {
    x: number;
    y: number;
}

export interface CursorFollowingTooltipDependencies {
    getContainer: () => HTMLElement | null;
    getTooltipElement: () => HTMLElement | null;
}
