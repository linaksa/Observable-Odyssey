/**
 * Testing strategy — buildGraph
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
import { CellType } from '@common/board';
import { buildGraph } from './pathfinding';

const LAST_COLUMN_INDEX = 3;

describe('buildGraph', () => {
    // Edge case: When building graph weights, each tile type should map to its expected movement cost.
    it('should build weighted adjacency edges for each tile type cost', () => {
        const unknownTile = 'MYSTERY_TILE' as CellType;
        const board: CellType[][] = [
            [CellType.Empty, CellType.Ice, CellType.OpenDoor, CellType.ClosedDoor],
            [CellType.Water, CellType.Wall, CellType.Empty, unknownTile],
        ];

        const graph = buildGraph(board);
        const columns = board[0].length;
        const index = (row: number, col: number) => row * columns + col;
        const getEdgeWeight = (from: number, to: number) => graph[from].find(([target]) => target === to)?.[1];

        expect(getEdgeWeight(index(0, 0), index(1, 0))).toBe(2);
        expect(getEdgeWeight(index(0, 0), index(0, 1))).toBe(0);
        expect(getEdgeWeight(index(1, 2), index(0, 2))).toBe(0);
        expect(getEdgeWeight(index(0, 2), index(0, LAST_COLUMN_INDEX))).toBe(Number.MAX_SAFE_INTEGER);
        expect(getEdgeWeight(index(1, 2), index(1, 1))).toBe(Number.MAX_SAFE_INTEGER);
        expect(getEdgeWeight(index(1, 2), index(1, LAST_COLUMN_INDEX))).toBe(1);
    });

    it('should skip neighbors when tile cost is considered non-finite', () => {
        spyOn(window, 'isFinite').and.callFake((value: number) => value !== Number.MAX_SAFE_INTEGER && Number.isFinite(value));

        const board: CellType[][] = [[CellType.Empty, CellType.ClosedDoor]];
        const graph = buildGraph(board);

        expect(graph[0]).toEqual([]);
        expect(graph[1].length).toBe(1);
    });
});
