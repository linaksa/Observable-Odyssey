/**
 * Testing strategy — Minimum heap utility
 *
 * Approach:
 * - Validate heap ordering across push/pop operations.
 * - Cover empty and single-element pop paths.
 *
 * Edge cases covered:
 * - Bubble-down right-child swap path.
 */
import { MinimumHeap } from '@app/utils/min-heap';

const THREE = 3;
const FOUR = 4;
const FIVE = 5;
const SEVEN = 7;

describe('MinimumHeap', () => {
    it('returns undefined when popping from an empty heap', () => {
        // Edge case
        const heap = new MinimumHeap<[number, number]>();

        expect(heap.isEmpty()).toBeTrue();
        expect(heap.pop()).toBeUndefined();
    });

    it('pops items in ascending priority order', () => {
        // Nominal case
        const heap = new MinimumHeap<[number, number]>();
        heap.push([FIVE, FIVE]);
        heap.push([THREE, THREE]);
        heap.push([FOUR, FOUR]);
        heap.push([1, 1]);
        heap.push([2, 2]);

        expect(heap.pop()).toEqual([1, 1]);
        expect(heap.pop()).toEqual([2, 2]);
        expect(heap.pop()).toEqual([THREE, THREE]);
        expect(heap.pop()).toEqual([FOUR, FOUR]);
        expect(heap.pop()).toEqual([FIVE, FIVE]);
        expect(heap.isEmpty()).toBeTrue();
    });

    it('handles pop when exactly one element is present', () => {
        // Edge case
        const heap = new MinimumHeap<[number, number]>();
        heap.push([SEVEN, 1]);

        expect(heap.pop()).toEqual([SEVEN, 1]);
        expect(heap.pop()).toBeUndefined();
    });
});
/* Merged from min-heap.extra.spec.ts */

(() => {
    const ROOT_PRIORITY = 1;
    const LEFT_PRIORITY = 5;
    const RIGHT_PRIORITY = 2;
    const LARGE_PRIORITY = 10;

    describe('MinimumHeap (extra)', () => {
        it('selects right child during bubble-down when right has smaller priority', () => {
            const heap = new MinimumHeap<[number, number]>();

            heap.push([ROOT_PRIORITY, ROOT_PRIORITY]);
            heap.push([LEFT_PRIORITY, LEFT_PRIORITY]);
            heap.push([RIGHT_PRIORITY, RIGHT_PRIORITY]);
            heap.push([LARGE_PRIORITY - 1, LARGE_PRIORITY - 1]);
            heap.push([LARGE_PRIORITY, LARGE_PRIORITY]);

            expect(heap.pop()).toEqual([ROOT_PRIORITY, ROOT_PRIORITY]);
            expect(heap.pop()).toEqual([RIGHT_PRIORITY, RIGHT_PRIORITY]);
        });
    });
})();
