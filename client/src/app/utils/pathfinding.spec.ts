/* eslint-disable @typescript-eslint/no-magic-numbers -- To make the spec file easier to read */
/**
 * Testing strategy — Pathfinding graph builder
 *
 * Approach:
 * - Build compact board fixtures and assert adjacency/weights by index.
 * - Validate blocked cells from sanctuaries and non-abandoned players.
 *
 * Edge cases covered:
 * - Unknown tile type falls back to grass/door cost.
 */
import { buildGraph } from '@app/utils/pathfinding';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType, GRASS_OR_DOOR_MOVEMENT_COST, ICE_MOVEMENT_COST, WATER_MOVEMENT_COST } from '@common/constants';
import { IItem, ItemType } from '@common/items';

const THREE = 3;
const FOUR = 4;
const FIVE = 5;

describe('pathfinding buildGraph', () => {
    it('builds weighted adjacency respecting tile movement costs', () => {
        // Nominal case
        const board: CellType[][] = [
            [CellType.Empty, CellType.Ice, CellType.Water],
            [CellType.Wall, CellType.OpenDoor, CellType.ClosedDoor],
        ];

        const graph = buildGraph(board);

        expect(graph[0]).toContain([1, ICE_MOVEMENT_COST]);
        expect(graph[1]).toContain([0, GRASS_OR_DOOR_MOVEMENT_COST]);
        expect(graph[1]).toContain([2, WATER_MOVEMENT_COST]);
        expect(graph[1]).toContain([FOUR, GRASS_OR_DOOR_MOVEMENT_COST]);
        expect(graph[2].some(([nodeIndex]) => nodeIndex === FIVE)).toBeFalse();
    });

    it('blocks sanctuary footprint and active-player positions while ignoring abandoned players', () => {
        // Edge case
        const board: CellType[][] = [
            [CellType.Empty, CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.Empty, CellType.Empty],
        ];
        const items: IItem[] = [{ itemType: ItemType.LifeSanctuary, x: 1, y: 1, size: FOUR, active: true }];
        const players: ICharacter[] = [createPlayer('Alice', 0, 1, false), createPlayer('Bob', 2, 0, true)];

        const graph = buildGraph(board, items, players);

        expect(graph[0].some(([nodeIndex]) => nodeIndex === THREE)).toBeFalse();
        expect(graph[0].some(([nodeIndex]) => nodeIndex === 1)).toBeTrue();
        expect(graph[1].some(([nodeIndex]) => nodeIndex === FOUR)).toBeFalse();
        expect(graph[1].some(([nodeIndex]) => nodeIndex === 2)).toBeTrue();
    });

    it('uses default movement cost for unknown cell values', () => {
        // Edge case
        const board = [[CellType.Empty, 'UNKNOWN' as unknown as CellType]];

        const graph = buildGraph(board);

        expect(graph[0]).toContain([1, GRASS_OR_DOOR_MOVEMENT_COST]);
    });

    it('does not block cells for non-sanctuary items', () => {
        // Edge case: sanctuary blocking should be skipped when coverage check returns false.
        const board: CellType[][] = [
            [CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.Empty],
        ];
        const items: IItem[] = [{ itemType: ItemType.Flag, x: 1, y: 1, size: 1, isCarried: false }];

        const graph = buildGraph(board, items, []);

        expect(graph[0].some(([nodeIndex]) => nodeIndex === 2)).toBeTrue();
        expect(graph[1].some(([nodeIndex]) => nodeIndex === 3)).toBeTrue();
    });

    function createPlayer(name: string, x: number, y: number, hasAbandoned: boolean): ICharacter {
        return {
            name,
            avatar: Avatar.Avatar1,
            initialHealth: 10,
            currentHealth: 10,
            attackBonusDiceType: DiceType.FourSided,
            defenseBonusDiceType: DiceType.SixSided,
            rapidityPoints: FOUR,
            attackPoints: FOUR,
            defensePoints: FOUR,
            actionsLeft: 1,
            movementLeft: THREE,
            victories: 0,
            hasAbandoned,
            startingPosition: { x, y },
            currentPosition: { x, y },
            nCombats: 0,
            nVictories: 0,
            nDefeats: 0,
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            visitedCells: [],
        };
    }
});
