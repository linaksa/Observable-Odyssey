/**
 * Testing strategy — Dijkstra utilities
 *
 * Approach:
 * - Validate shortest-path and predecessor generation on weighted adjacency graphs.
 * - Cover path reconstruction and directional helpers.
 *
 * Edge cases covered:
 * - Outdated queue entries and unreachable target reconstruction.
 */
import { dijkstra, Direction, indexToDirection, reconstructPath } from '@app/utils/dijkstra';
import { MinimumHeap } from '@app/utils/min-heap';

const THREE = 3;
const FOUR = 4;
const FIVE = 5;
const TEN = 10;

describe('dijkstra utilities', () => {
    it('computes shortest distances and predecessors including stale queue entries', () => {
        // Nominal case
        const graph: [number, number][][] = [
            [
                [1, TEN],
                [2, 1],
            ],
            [[THREE, 1]],
            [[1, 1]],
            [],
        ];

        const result = dijkstra(graph, 0);

        expect(result.distances).toEqual([0, 2, 1, THREE]);
        expect(result.predecessors).toEqual([null, 2, 0, 1]);
    });

    it('reconstructs path excluding target cell and handles missing predecessor chain', () => {
        // Edge case
        expect(reconstructPath([null, 0, 1], 0, 2)).toEqual([1]);
        expect(reconstructPath([null, null, null], 0, 2)).toEqual([]);
        expect(reconstructPath([null, 0], 0, 0)).toEqual([]);
    });

    it('maps flat indices to cardinal directions', () => {
        // Nominal case
        expect(indexToDirection(FIVE, 1, FOUR)).toBe(Direction.Up);
        expect(indexToDirection(1, FIVE, FOUR)).toBe(Direction.Down);
        expect(indexToDirection(FIVE, FOUR, FOUR)).toBe(Direction.Left);
        expect(indexToDirection(FOUR, FIVE, FOUR)).toBe(Direction.Right);
    });
});
/* Merged from dijkstra.extra.spec.ts */

(() => {
    const SOURCE_INDEX = 0;
    const FIRST_CALL_INDEX = 1;

    describe('dijkstra utilities (extra)', () => {
        it('handles undefined top entries from the heap pop defensively', () => {
            const originalPop: (this: MinimumHeap<[number, number]>) => [number, number] | undefined = MinimumHeap.prototype.pop;
            let popCallCount = 0;

            spyOn(MinimumHeap.prototype, 'pop').and.callFake(function (this: MinimumHeap<[number, number]>) {
                const actual = originalPop.call(this);
                popCallCount += 1;
                return popCallCount === FIRST_CALL_INDEX ? undefined : actual;
            });

            const result = dijkstra([[]], SOURCE_INDEX);

            expect(result.distances).toEqual([0]);
            expect(result.predecessors).toEqual([null]);
        });
    });
})();
