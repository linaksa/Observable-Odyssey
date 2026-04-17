/**
 * Testing strategy — Tooltip position utility
 *
 * Approach:
 * - Validate axis placement and clamping logic against controlled dimensions.
 *
 * Edge cases covered:
 * - Invalid container bounds fall back to the previous tooltip position.
 */
import { computeTooltipPosition } from '@app/utils/tooltip-position.utils';

describe('computeTooltipPosition', () => {
    it('positions tooltip forward when there is enough space', () => {
        // Nominal case
        const result = computeTooltipPosition({
            event: { clientX: 50, clientY: 60 } as MouseEvent,
            containerRect: { left: 0, top: 0, width: 200, height: 200 } as DOMRect,
            tooltipWidth: 40,
            tooltipHeight: 30,
            horizontalOffsetPx: 10,
            verticalOffsetPx: 8,
            fallbackPosition: { x: 0, y: 0 },
        });

        expect(result).toEqual({ x: 60, y: 68 });
    });

    it('positions tooltip backward when forward placement overflows but backward fits', () => {
        // Edge case
        const result = computeTooltipPosition({
            event: { clientX: 190, clientY: 180 } as MouseEvent,
            containerRect: { left: 0, top: 0, width: 220, height: 220 } as DOMRect,
            tooltipWidth: 70,
            tooltipHeight: 60,
            horizontalOffsetPx: 10,
            verticalOffsetPx: 8,
            fallbackPosition: { x: 0, y: 0 },
        });

        expect(result).toEqual({ x: 110, y: 112 });
    });

    it('clamps tooltip coordinates when neither forward nor backward fits', () => {
        // Edge case
        const result = computeTooltipPosition({
            event: { clientX: 5, clientY: 5 } as MouseEvent,
            containerRect: { left: 0, top: 0, width: 40, height: 40 } as DOMRect,
            tooltipWidth: 60,
            tooltipHeight: 60,
            horizontalOffsetPx: 10,
            verticalOffsetPx: 10,
            fallbackPosition: { x: 11, y: 22 },
        });

        expect(result).toEqual({ x: 0, y: 0 });
    });

    it('uses window bounds when containerRect is missing', () => {
        // Nominal case
        const originalWidth = window.innerWidth;
        const originalHeight = window.innerHeight;
        try {
            Object.defineProperty(window, 'innerWidth', { configurable: true, value: 300 });
            Object.defineProperty(window, 'innerHeight', { configurable: true, value: 200 });

            const result = computeTooltipPosition({
                event: { clientX: 280, clientY: 180 } as MouseEvent,
                containerRect: undefined,
                tooltipWidth: 80,
                tooltipHeight: 50,
                horizontalOffsetPx: 10,
                verticalOffsetPx: 10,
                fallbackPosition: { x: 0, y: 0 },
            });

            expect(result).toEqual({ x: 190, y: 120 });
        } finally {
            Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
            Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
        }
    });

    it('returns fallback position when bounds are invalid', () => {
        // Edge case
        const originalWidth = window.innerWidth;
        const originalHeight = window.innerHeight;
        const fallback = { x: 7, y: 9 };
        try {
            Object.defineProperty(window, 'innerWidth', { configurable: true, value: 0 });
            Object.defineProperty(window, 'innerHeight', { configurable: true, value: 0 });

            const result = computeTooltipPosition({
                event: { clientX: 0, clientY: 0 } as MouseEvent,
                containerRect: undefined,
                tooltipWidth: 10,
                tooltipHeight: 10,
                horizontalOffsetPx: 2,
                verticalOffsetPx: 2,
                fallbackPosition: fallback,
            });

            expect(result).toBe(fallback);
        } finally {
            Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
            Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
        }
    });
});
