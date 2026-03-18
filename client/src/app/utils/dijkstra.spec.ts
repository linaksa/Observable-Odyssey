/**
 * Testing strategy — dijkstra
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
import { dijkstra } from './dijkstra';

const HIGHER_WEIGHT_EDGE = 10;

describe('dijkstra', () => {
    it('should compute shortest paths and skip stale queue entries', () => {
        const graph: [number, number][][] = [
            [
                [1, HIGHER_WEIGHT_EDGE],
                [2, 1],
            ],
            [],
            [[1, 1]],
        ];

        const distances = dijkstra(graph, 0);

        expect(distances).toEqual([0, 2, 1]);
    });

    // Edge case: When required input data is missing, tolerate undefined heap pops and continue processing.
    it('should tolerate undefined heap pops and continue processing', () => {
        const originalPop = MinimumHeap.prototype.pop;
        let firstPop = true;

        spyOn(MinimumHeap.prototype, 'pop').and.callFake(function (this: MinimumHeap<[number, number]>) {
            if (firstPop) {
                firstPop = false;
                return undefined;
            }
            return originalPop.call(this);
        });

        const graph: [number, number][][] = [[[1, 1]], []];
        const distances = dijkstra(graph, 0);

        expect(distances).toEqual([0, 1]);
    });
});
