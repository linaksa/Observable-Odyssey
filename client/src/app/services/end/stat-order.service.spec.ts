/**
 * Testing strategy — StatOrderService
 *
 * Approach:
 * - Sort deterministic stats fixtures with each supported `StatArg` comparator.
 * - Assert sort direction toggling when the same key is reused and reset when key changes.
 *
 * Edge cases covered:
 * - Unsupported sort arguments trigger the default reverse-order fallback.
 * - Direction reset prevents stale ascending/descending state between different criteria.
 */
import { OrderDirection, StatOrderArgs } from '@app/constants/stats';
import { StatOrderService } from '@app/services/end/stat-order.service';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';

const THREE = 3;
const FOUR = 4;
const FIVE = 5;
const EIGHT = 8;
const NINE = 9;
const TEN = 10;

describe('StatOrderService', () => {
    let service: StatOrderService;

    beforeEach(() => {
        service = new StatOrderService();
    });

    it('sorts by combats and toggles direction when same arg is reused', () => {
        // Nominal case
        const players = [createPlayer('Alice', 1, TEN, FIVE, 1), createPlayer('Bob', THREE, 2, 2, THREE), createPlayer('Carol', 2, EIGHT, 1, 2)];

        const firstPass = service.orderPlayers([...players], StatOrderArgs.NCombats);
        expect(firstPass.map((player) => player.name)).toEqual(['Alice', 'Carol', 'Bob']);
        expect(service.direction).toBe(OrderDirection.Descending);

        const secondPass = service.orderPlayers([...players], StatOrderArgs.NCombats);
        expect(secondPass.map((player) => player.name)).toEqual(['Bob', 'Carol', 'Alice']);
        expect(service.direction).toBe(OrderDirection.Ascending);

        const thirdPass = service.orderPlayers([...players], StatOrderArgs.NCombats);
        expect(thirdPass.map((player) => player.name)).toEqual(['Alice', 'Carol', 'Bob']);
        expect(service.direction).toBe(OrderDirection.Descending);
    });

    it('sorts with each supported comparator key', () => {
        // Nominal case
        const players = [createPlayer('Alice', 1, TEN, FIVE, FOUR), createPlayer('Bob', THREE, 2, 2, 1), createPlayer('Carol', 2, EIGHT, NINE, 2)];

        const byDamageDealt = service.orderPlayers([...players], StatOrderArgs.NDamageDealt);
        expect(byDamageDealt.map((player) => player.name)).toEqual(['Bob', 'Carol', 'Alice']);

        const byDamageTaken = service.orderPlayers([...players], StatOrderArgs.NDamageTaken);
        expect(byDamageTaken.map((player) => player.name)).toEqual(['Bob', 'Alice', 'Carol']);

        const byVisited = service.orderPlayers([...players], StatOrderArgs.NVisitedCells);
        expect(byVisited.map((player) => player.name)).toEqual(['Bob', 'Carol', 'Alice']);
    });

    it('falls back to stable reverse when using an unsupported stat argument', () => {
        // Edge case
        const players = [createPlayer('Alice', 1, 1, 1, 1), createPlayer('Bob', 2, 2, 2, 2), createPlayer('Carol', THREE, THREE, THREE, THREE)];

        const result = service.orderPlayers([...players], StatOrderArgs.NVictories);

        expect(result.map((player) => player.name)).toEqual(['Carol', 'Bob', 'Alice']);
        expect(service.currentOrderArg).toBe(StatOrderArgs.NVictories);
    });

    function createPlayer(name: string, nCombats: number, totalDamageDealt: number, totalDamageReceived: number, visitedCount: number): ICharacter {
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
            movementLeft: 3,
            victories: 0,
            hasAbandoned: false,
            startingPosition: { x: 0, y: 0 },
            currentPosition: { x: 0, y: 0 },
            nCombats,
            nVictories: 0,
            nDefeats: 0,
            totalDamageDealt,
            totalDamageReceived,
            visitedCells: Array.from({ length: visitedCount }, (_, index) => `${index},0`),
        };
    }
});
