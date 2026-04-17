/**
 * Testing strategy — Dijkstra
 *
 * Approach:
 * - Validate shortest-path distance and predecessor outputs from `dijkstra`.
 * - Validate intermediate-node reconstruction from predecessor chains.
 * - Validate index-to-direction translation on a fixed-size grid.
 *
 * Edge cases covered:
 * - Unreachable nodes remain at `Infinity`.
 * - Stale/undefined heap pops are ignored without breaking traversal.
 * - Path reconstruction handles adjacent nodes without adding intermediates.
 */
import { expect } from 'chai';
import * as sinon from 'sinon';
import { dijkstra, reconstructPath, indexToDirection, Direction } from '@app/utils/dijkstra';
import { MinimumHeap } from '@app/utils/min-heap';

const THREE = 3;
const FIVE = 5;
const TEN = 10;

describe('dijkstra()', () => {
    it('should set distance 0 for the source node — Nominal case', () => {
        const adj: [number, number][][] = [[]];
        const { distances } = dijkstra(adj, 0);
        expect(distances[0]).to.equal(0);
    });

    it('should compute correct distances in a simple linear graph — Nominal case', () => {
        // 0 --1-- 1 --1-- 2
        const adj: [number, number][][] = [
            [[1, 1]],
            [
                [0, 1],
                [2, 1],
            ],
            [[1, 1]],
        ];
        const { distances } = dijkstra(adj, 0);
        expect(distances[0]).to.equal(0);
        expect(distances[1]).to.equal(1);
        expect(distances[2]).to.equal(2);
    });

    it('should return Infinity for unreachable nodes — Edge case', () => {
        // node 2 is isolated
        const adj: [number, number][][] = [[[1, 1]], [[0, 1]], []];
        const { distances } = dijkstra(adj, 0);
        expect(distances[2]).to.equal(Infinity);
    });

    it('should set predecessors correctly along the shortest path — Nominal case', () => {
        const adj: [number, number][][] = [
            [[1, 1]],
            [
                [0, 1],
                [2, 1],
            ],
            [[1, 1]],
        ];
        const { predecessors } = dijkstra(adj, 0);
        expect(predecessors[0]).to.equal(null);
        expect(predecessors[1]).to.equal(0);
        expect(predecessors[2]).to.equal(1);
    });

    it('should pick the minimum-weight path over a longer but lighter route — Nominal case', () => {
        // Direct edge 0→2 costs 10; path through 1 costs 2
        const adj: [number, number][][] = [
            [
                [1, 1],
                [2, TEN],
            ],
            [[2, 1]],
            [],
        ];
        const { distances, predecessors } = dijkstra(adj, 0);
        expect(distances[2]).to.equal(2);
        expect(predecessors[2]).to.equal(1);
    });

    it('should ignore a stale priority-queue entry with worse distance — Edge case', () => {
        // Two edges to node 1: ensure the larger stale distance is discarded.
        const adj: [number, number][][] = [
            [
                [1, 1],
                [1, FIVE],
            ],
            [],
        ];
        const { distances } = dijkstra(adj, 0);
        expect(distances[1]).to.equal(1);
    });

    it('skips an undefined heap pop entry and continues processing', () => {
        const popStub = sinon.stub(MinimumHeap.prototype, 'pop');
        try {
            popStub.onCall(0).returns(undefined);
            popStub.callThrough();

            const adj: [number, number][][] = [[[1, 1]], []];
            const { distances } = dijkstra(adj, 0);

            expect(distances[1]).to.equal(1);
        } finally {
            popStub.restore();
        }
    });
});

describe('reconstructPath()', () => {
    it('should return intermediate indices excluding src and target — Nominal case', () => {
        // path 0 → 1 → 2 → 3
        const predecessors: (number | null)[] = [null, 0, 1, 2];
        const path = reconstructPath(predecessors, 0, THREE);
        expect(path).to.deep.equal([1, 2]);
    });

    it('should return empty array when src is directly adjacent to target — Edge case', () => {
        const predecessors: (number | null)[] = [null, 0];
        const path = reconstructPath(predecessors, 0, 1);
        expect(path).to.deep.equal([]);
    });

    it('should return single intermediate for a two-hop path — Nominal case', () => {
        // path 0 → 1 → 2
        const predecessors: (number | null)[] = [null, 0, 1];
        const path = reconstructPath(predecessors, 0, 2);
        expect(path).to.deep.equal([1]);
    });
});

describe('indexToDirection()', () => {
    // 3-column grid layout:
    //  0  1  2   (row 0)
    //  3  4  5   (row 1)

    it('should return Direction.Up when moving to a row above — Nominal case', () => {
        // from index 3 (row1,col0) to index 0 (row0,col0)
        expect(indexToDirection(THREE, 0, THREE)).to.equal(Direction.Up);
    });

    it('should return Direction.Down when moving to a row below — Nominal case', () => {
        expect(indexToDirection(0, THREE, THREE)).to.equal(Direction.Down);
    });

    it('should return Direction.Left when moving to the column on the left — Nominal case', () => {
        // from index 1 (row0,col1) to index 0 (row0,col0)
        expect(indexToDirection(1, 0, THREE)).to.equal(Direction.Left);
    });

    it('should return Direction.Right when moving to the column on the right — Nominal case', () => {
        expect(indexToDirection(0, 1, THREE)).to.equal(Direction.Right);
    });
});
