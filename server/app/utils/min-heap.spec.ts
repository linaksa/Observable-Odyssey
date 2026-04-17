/**
 * Testing strategy — Min Heap
 *
 * Approach:
 * - Push mixed-priority tuples and assert ascending pop order.
 * - Exercise pop behavior on empty heaps and on right-child bubble-down branches.
 *
 * Edge cases covered:
 * - Empty heap pops return `undefined` without mutating state.
 * - Heapify-down keeps ordering when the right child is the lower-priority candidate.
 */
import { MinimumHeap } from '@app/utils/min-heap';
import { expect } from 'chai';

const THREE = 3;
const FOUR = 4;
const FIVE = 5;
const ONE_HUNDRED = 100;
const TWO_HUNDRED = 200;
const THREE_HUNDRED = 300;
const FIVE_HUNDRED = 500;

describe('Min Heap', () => {
    it('should return undefined when popping an empty heap', () => {
        const heap = new MinimumHeap<[number, number]>();

        expect(heap.isEmpty()).to.equal(true);
        expect(heap.pop()).to.equal(undefined);
    });

    it('should pop values in ascending priority order', () => {
        const heap = new MinimumHeap<[number, number]>();
        heap.push([FIVE, FIVE_HUNDRED]);
        heap.push([1, ONE_HUNDRED]);
        heap.push([THREE, THREE_HUNDRED]);
        heap.push([2, TWO_HUNDRED]);

        expect(heap.pop()).to.deep.equal([1, ONE_HUNDRED]);
        expect(heap.pop()).to.deep.equal([2, TWO_HUNDRED]);
        expect(heap.pop()).to.deep.equal([THREE, THREE_HUNDRED]);
        expect(heap.pop()).to.deep.equal([FIVE, FIVE_HUNDRED]);
        expect(heap.pop()).to.equal(undefined);
    });

    it('should keep heap property when right child is the smaller candidate', () => {
        const heap = new MinimumHeap<[number, number]>();
        heap.push([0, 0]);
        heap.push([FOUR, FOUR]);
        heap.push([1, 1]);
        heap.push([FIVE, FIVE]);

        expect(heap.pop()).to.deep.equal([0, 0]);
        expect(heap.pop()).to.deep.equal([1, 1]);
        expect(heap.pop()).to.deep.equal([FOUR, FOUR]);
        expect(heap.pop()).to.deep.equal([FIVE, FIVE]);
    });
});
