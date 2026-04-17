/**
 * Testing strategy — Cursor-following tooltip controller
 *
 * Approach:
 * - Mock container/tooltip geometry and verify pointer-to-position mapping.
 * - Cover early returns and fallback viewport behavior.
 *
 * Edge cases covered:
 * - Repeated sync with identical computed position should be stable.
 */
import { CursorFollowingTooltipController } from '@app/utils/cursor-following-tooltip.controller';

const FIVE = 5;
const TEN = 10;
const TWENTY = 20;
const THIRTY = 30;
const FORTY = 40;
const ONE_HUNDRED = 100;
const TWO_HUNDRED = 200;

describe('CursorFollowingTooltipController', () => {
    it('tracks and clears pointer', () => {
        // Nominal case
        const controller = new CursorFollowingTooltipController({
            getContainer: () => null,
            getTooltipElement: () => null,
        });

        controller.setPointer(TEN, TWENTY);
        expect(controller.tooltipPointer()).toEqual({ x: TEN, y: TWENTY });

        controller.clearPointer();
        expect(controller.tooltipPointer()).toBeNull();
    });

    it('computes tooltip position using container-relative coordinates', () => {
        // Nominal case
        const container = document.createElement('div');
        const tooltip = document.createElement('div');
        spyOn(container, 'getBoundingClientRect').and.returnValue({ left: 10, top: 20, width: 100, height: 100 } as DOMRect);
        spyOn(tooltip, 'getBoundingClientRect').and.returnValue({ width: 40, height: 20 } as DOMRect);

        const controller = new CursorFollowingTooltipController({
            getContainer: () => container,
            getTooltipElement: () => tooltip,
        });

        controller.setPointer(THIRTY, FORTY);
        controller.syncTooltipPosition(true);

        expect(controller.tooltipPosition()).toEqual({ x: 20, y: 44 });

        controller.syncTooltipPosition(true);
        expect(controller.tooltipPosition()).toEqual({ x: 20, y: 44 });
    });

    it('uses viewport fallback when container is unavailable', () => {
        // Edge case
        const originalWidth = window.innerWidth;
        const originalHeight = window.innerHeight;
        try {
            Object.defineProperty(window, 'innerWidth', { configurable: true, value: 120 });
            Object.defineProperty(window, 'innerHeight', { configurable: true, value: 90 });

            const controller = new CursorFollowingTooltipController({
                getContainer: () => null,
                getTooltipElement: () => null,
            });

            controller.setPointer(TWO_HUNDRED, FIVE);
            controller.syncTooltipPosition(true);

            expect(controller.tooltipPosition().x).toBe(ONE_HUNDRED);
            expect(controller.tooltipPosition().y).toBe(TEN);
        } finally {
            Object.defineProperty(window, 'innerWidth', { configurable: true, value: originalWidth });
            Object.defineProperty(window, 'innerHeight', { configurable: true, value: originalHeight });
        }
    });

    it('does nothing when tooltip is hidden or pointer is missing', () => {
        // Edge case
        const controller = new CursorFollowingTooltipController({
            getContainer: () => null,
            getTooltipElement: () => null,
        });

        controller.syncTooltipPosition(true);
        expect(controller.tooltipPosition()).toEqual({ x: 0, y: 0 });

        controller.setPointer(TWENTY, TWENTY);
        controller.syncTooltipPosition(false);
        expect(controller.tooltipPosition()).toEqual({ x: 0, y: 0 });
    });
});
