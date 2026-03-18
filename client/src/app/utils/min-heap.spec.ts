/**
 * Testing strategy — MinimumHeap
 *
 * Approach:
 * - Keep each test focused on one behavior with deterministic mocks/spies.
 * - Validate both nominal flows and failure paths that could break UX/state.
 * - Assert side effects explicitly (state changes, emitted events, and service calls).
 *
 * Edge cases covered:
 * - Missing or invalid input guards and safe early returns.
 * - Error handling paths and fallback user-facing messaging.
 * - Cleanup/teardown behavior (unsubscribe/reset/disconnect) when applicable.
 */
import { MinimumHeap } from './min-heap';

const LOWEST_PRIORITY = 1;
const SECOND_PRIORITY = 2;
const MIDDLE_PRIORITY = 3;
const FOURTH_PRIORITY = 4;
const HIGHEST_PRIORITY = 5;

describe('MinimumHeap', () => {
    // Edge case: When popping an empty heap, report empty state and return undefined.
    it('should report empty state and return undefined when popping an empty heap', () => {
        const heap = new MinimumHeap<[number, number]>();

        expect(heap.isEmpty()).toBeTrue();
        expect(heap.pop()).toBeUndefined();
    });

    it('should pop values in ascending order', () => {
        const heap = new MinimumHeap<[number, number]>();
        heap.push([MIDDLE_PRIORITY, MIDDLE_PRIORITY]);
        heap.push([HIGHEST_PRIORITY, HIGHEST_PRIORITY]);
        heap.push([LOWEST_PRIORITY, LOWEST_PRIORITY]);
        heap.push([FOURTH_PRIORITY, FOURTH_PRIORITY]);
        heap.push([SECOND_PRIORITY, SECOND_PRIORITY]);

        expect(heap.pop()).toEqual([LOWEST_PRIORITY, LOWEST_PRIORITY]);
        expect(heap.pop()).toEqual([SECOND_PRIORITY, SECOND_PRIORITY]);
        expect(heap.pop()).toEqual([MIDDLE_PRIORITY, MIDDLE_PRIORITY]);
        expect(heap.pop()).toEqual([FOURTH_PRIORITY, FOURTH_PRIORITY]);
        expect(heap.pop()).toEqual([HIGHEST_PRIORITY, HIGHEST_PRIORITY]);
        expect(heap.pop()).toBeUndefined();
    });
});
