/**
 * Testing strategy — Player stat formatting utility
 *
 * Approach:
 * - Validate nominal numeric formatting and missing-value fallback.
 */
import { formatPlayerStatValue } from '@app/utils/player-stat.utils';
import { Avatar, DiceType } from '@common/constants';
import { ICharacter } from '@common/character';

const STAT_VALUE = 42;

describe('formatPlayerStatValue', () => {
    it('formats numeric values when player and value are defined', () => {
        // Nominal case
        expect(formatPlayerStatValue(createPlayer(), STAT_VALUE)).toBe('42');
    });

    it('returns em dash when player or value is missing', () => {
        // Edge case
        expect(formatPlayerStatValue(undefined, STAT_VALUE)).toBe('—');
        expect(formatPlayerStatValue(null, STAT_VALUE)).toBe('—');
        expect(formatPlayerStatValue(createPlayer(), undefined)).toBe('—');
    });

    function createPlayer(): ICharacter {
        return {
            name: 'Alice',
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
            nCombats: 0,
            nVictories: 0,
            nDefeats: 0,
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            visitedCells: [],
        };
    }
});
