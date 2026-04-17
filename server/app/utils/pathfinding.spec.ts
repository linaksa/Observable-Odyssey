/**
 * Testing strategy — Pathfinding (buildGraph)
 *
 * Approach:
 * - Build small deterministic boards and assert generated adjacency/cost outputs.
 * - Validate movement rules for terrain, doors, occupied cells, and sanctuary coverage.
 * - Keep assertions focused on graph edges and movement costs for each branch.
 *
 * Edge cases covered:
 * - Closed doors are blocked when no action points remain.
 * - Abandoned players no longer block traversal.
 * - Unknown cell types fall back to grass/door movement cost.
 * - Sanctuary-covered cells are excluded while non-sanctuary items are ignored.
 */
import { expect } from 'chai';
import { buildGraph } from '@app/utils/pathfinding';
import { CellType } from '@common/board';
import { ICharacter, Team } from '@common/character';
import { Avatar, DiceType, GRASS_OR_DOOR_MOVEMENT_COST, ICE_MOVEMENT_COST, WATER_MOVEMENT_COST } from '@common/constants';
import { IItem, ItemType, SANCTUARY_SIZE } from '@common/items';

// Helper accessors for graph assertions.

function getTargets(graph: [number, number][][], node: number): number[] {
    return graph[node].map(([t]) => t);
}

function getCost(graph: [number, number][][], from: number, to: number): number | undefined {
    const edge = graph[from].find(([t]) => t === to);
    return edge?.[1];
}

function createPlayer(name: string, position: { x: number; y: number }): ICharacter {
    return {
        name,
        avatar: Avatar.Avatar1,
        initialHealth: 6,
        currentHealth: 6,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints: 3,
        attackPoints: 4,
        defensePoints: 4,
        actionsLeft: 1,
        movementLeft: 3,
        victories: 0,
        hasAbandoned: false,
        startingPosition: { x: 0, y: 0 },
        currentPosition: position,
        team: Team.RED,
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}

// buildGraph scenarios.

describe('buildGraph()', () => {
    const E = CellType.Empty;
    const W = CellType.Wall;
    const I = CellType.Ice;
    const O = CellType.OpenDoor;
    const C = CellType.ClosedDoor;
    const WA = CellType.Water;

    it('should create bidirectional edges for an all-empty board — Nominal case', () => {
        const board = [
            [E, E],
            [E, E],
        ];
        const graph = buildGraph(board);
        // Node 0 (top-left) → right (1) and down (2)
        expect(getTargets(graph, 0)).to.include(1);
        expect(getTargets(graph, 0)).to.include(2);
        // Reverse edges exist
        expect(getTargets(graph, 1)).to.include(0);
        expect(getTargets(graph, 2)).to.include(0);
    });

    it('should not add an edge toward a wall cell — Nominal case', () => {
        const board = [
            [E, W],
            [E, E],
        ];
        const graph = buildGraph(board);
        expect(getTargets(graph, 0)).to.not.include(1);
    });

    it('should assign ICE_MOVEMENT_COST for ice cells — Nominal case', () => {
        const board = [
            [E, I],
            [E, E],
        ];
        const graph = buildGraph(board);
        expect(getCost(graph, 0, 1)).to.equal(ICE_MOVEMENT_COST);
    });

    it('should assign WATER_MOVEMENT_COST for water cells — Nominal case', () => {
        const board = [
            [E, WA],
            [E, E],
        ];
        const graph = buildGraph(board);
        expect(getCost(graph, 0, 1)).to.equal(WATER_MOVEMENT_COST);
    });

    it('should allow passage through an open door at grass cost — Nominal case', () => {
        const board = [
            [E, O],
            [E, E],
        ];
        const graph = buildGraph(board);
        expect(getTargets(graph, 0)).to.include(1);
        expect(getCost(graph, 0, 1)).to.equal(GRASS_OR_DOOR_MOVEMENT_COST);
    });

    it('should allow passage through a closed door when actionPoints > 0 — Nominal case', () => {
        const board = [
            [E, C],
            [E, E],
        ];
        const graph = buildGraph(board, 1);
        expect(getTargets(graph, 0)).to.include(1);
    });

    it('should block passage through a closed door when actionPoints = 0 — Edge case', () => {
        const board = [
            [E, C],
            [E, E],
        ];
        const graph = buildGraph(board, 0);
        expect(getTargets(graph, 0)).to.not.include(1);
    });

    it('should block a cell occupied by a non-abandoned player — Nominal case', () => {
        const board = [
            [E, E],
            [E, E],
        ];
        const player = createPlayer('Alice', { x: 1, y: 0 });
        const graph = buildGraph(board, 0, [], [player]);
        expect(getTargets(graph, 0)).to.not.include(1);
    });

    it('should not block a cell occupied by an abandoned player — Edge case', () => {
        const board = [
            [E, E],
            [E, E],
        ];
        const player = createPlayer('Alice', { x: 1, y: 0 });
        player.hasAbandoned = true;
        const graph = buildGraph(board, 0, [], [player]);
        expect(getTargets(graph, 0)).to.include(1);
    });

    it('should produce only 2 edges for a corner cell in a 2×2 empty board — Edge case', () => {
        const board = [
            [E, E],
            [E, E],
        ];
        const graph = buildGraph(board);
        // Top-left corner: only right and down
        expect(graph[0].length).to.equal(2);
    });

    it('should assign grass cost for unknown cell types (default branch) — Edge case', () => {
        const board = [
            [E, 'UNKNOWN' as CellType],
            [E, E],
        ];
        const graph = buildGraph(board);
        expect(getTargets(graph, 0)).to.include(1);
        expect(getCost(graph, 0, 1)).to.equal(GRASS_OR_DOOR_MOVEMENT_COST);
    });

    it('should block cells covered by a sanctuary item — Nominal case', () => {
        // Sanctuary at (0,0) covers rows 0-1 and cols 0-1.
        const board = [
            [E, E, E, E],
            [E, E, E, E],
            [E, E, E, E],
            [E, E, E, E],
        ];
        const sanctuary: IItem = {
            x: 0,
            y: 0,
            size: SANCTUARY_SIZE,
            itemType: ItemType.LifeSanctuary,
            active: true,
        };
        const graph = buildGraph(board, 0, [sanctuary], []);
        // Node index 2 (col 2, row 0) cannot move left because index 1 is sanctuary-covered.
        expect(getTargets(graph, 2)).to.not.include(1);
    });

    it('should ignore non-sanctuary items when building blocked cells — Edge case', () => {
        const board = [
            [E, E],
            [E, E],
        ];
        const nonSanctuaryItem: IItem = {
            x: 0,
            y: 0,
            size: 1,
            itemType: ItemType.Flag,
            isCarried: false,
        };

        const graph = buildGraph(board, 0, [nonSanctuaryItem], []);

        expect(getTargets(graph, 0)).to.include(1);
        expect(getTargets(graph, 0)).to.include(2);
    });
});
