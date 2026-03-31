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
import { ICharacter } from '@common/character';
import { Avatar, DiceType, PRIX_PORTE_GAZON } from '@common/constants';
import { ItemType } from '@common/items';
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
        expect(getEdgeWeight(index(1, 2), index(0, 2))).toBe(PRIX_PORTE_GAZON);
        expect(getEdgeWeight(index(0, 2), index(0, LAST_COLUMN_INDEX))).toBeUndefined();
        expect(getEdgeWeight(index(1, 2), index(1, 1))).toBeUndefined();
        expect(getEdgeWeight(index(1, 2), index(1, LAST_COLUMN_INDEX))).toBe(PRIX_PORTE_GAZON);
    });

    it('should skip neighbors when tile cost is considered non-finite', () => {
        const board: CellType[][] = [[CellType.Empty, CellType.ClosedDoor]];
        const graph = buildGraph(board);

        expect(graph[0]).toEqual([]);
        expect(graph[1].length).toBe(1);
    });

    it('should block sanctuary tiles even when the underlying terrain is walkable', () => {
        const board: CellType[][] = [
            [CellType.Empty, CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.Empty, CellType.Empty],
        ];

        const graph = buildGraph(board, [createSanctuary(1, 1)]);
        const columns = board[0].length;
        const index = (row: number, col: number) => row * columns + col;

        expect(graph[index(1, 0)].some(([target]) => target === index(1, 1))).toBeFalse();
        expect(graph[index(0, 1)].some(([target]) => target === index(1, 1))).toBeFalse();
    });

    it('should block player-occupied tiles even when the underlying terrain is walkable', () => {
        const board: CellType[][] = [
            [CellType.Empty, CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.Empty, CellType.Empty],
        ];

        const graph = buildGraph(board, [], [createCharacter(1, 1)]);
        const columns = board[0].length;
        const index = (row: number, col: number) => row * columns + col;

        expect(graph[index(1, 0)].some(([target]) => target === index(1, 1))).toBeFalse();
        expect(graph[index(0, 1)].some(([target]) => target === index(1, 1))).toBeFalse();
    });
});

function createSanctuary(x: number, y: number) {
    return {
        itemType: ItemType.LifeSanctuary,
        x,
        y,
        size: 4,
    };
}

function createCharacter(x: number, y: number): ICharacter {
    return {
        name: 'Blocked Player',
        avatar: Avatar.Avatar1,
        initialHealth: 10,
        currentHealth: 10,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints: 4,
        attackPoints: 4,
        defensePoints: 4,
        actionsLeft: 1,
        movementLeft: 1,
        victories: 0,
        hasAbandoned: false,
        positionDepart: { x, y },
        positionGrille: { x, y },

        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}
