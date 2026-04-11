/**
 * Testing strategy — pathfinding utils
 *
 * - Verify player occupancy is converted into graph blocks for active players.
 * - Verify abandoned players are ignored so their tiles remain reachable.
 */
import { buildGraph } from './pathfinding';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';

describe('buildGraph', () => {
    it('should keep abandoned players out of the blocked cells set', () => {
        const board = [
            [CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.Empty],
        ];
        const players = [createPlayer('Alice', { x: 1, y: 0 }, false), createPlayer('Bob', { x: 0, y: 1 }, true)];

        const graph = buildGraph(board, 0, [], players);

        const startCellIndex = 0;
        const abandonedCellIndex = 2;

        expect(graph[startCellIndex].some(([neighborIndex]) => neighborIndex === abandonedCellIndex)).toBeTrue();
    });
});

function createPlayer(name: string, currentPosition: { x: number; y: number }, hasAbandoned: boolean): ICharacter {
    return {
        name,
        avatar: Avatar.Avatar1,
        initialHealth: 10,
        currentHealth: 10,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints: 4,
        attackPoints: 4,
        defensePoints: 4,
        actionsLeft: 1,
        movementLeft: 4,
        victories: 0,
        hasAbandoned,
        startingPosition: currentPosition,
        currentPosition,
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}
