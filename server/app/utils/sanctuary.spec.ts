/**
 * Testing strategy — Sanctuary utilities
 *
 * Approach:
 * - Validate sanctuary type guards, geometry helpers, and activity-state checks.
 * - Validate mutation helpers (`deactivateSanctuary`, `advanceSanctuaryCooldowns`) across cooldown transitions.
 *
 * Edge cases covered:
 * - Non-sanctuary items, null, and undefined values are safely rejected.
 * - Adjacency/coverage only applies to sanctuary footprints.
 * - Cooldown advancement skips active sanctuaries and reactivates when countdown reaches zero.
 * - Inactive sanctuaries with zero remaining turns stay inactive until cooldown expires.
 */
import {
    advanceSanctuaryCooldowns,
    deactivateSanctuary,
    isPositionAdjacentToSanctuary,
    isSanctuaryActive,
    isSanctuaryItem,
    sanctuaryCoversCell,
} from '@app/utils/sanctuary';
import { SANCTUARY_COOLDOWN_TURN_STEPS } from '@common/constants';
import { IItem, ItemType, SANCTUARY_SIZE } from '@common/items';
import { expect } from 'chai';

const THREE = 3;
const FOUR = 4;

const makeLifeSanctuary = (x = 2, y = 2): IItem => ({ x, y, size: SANCTUARY_SIZE, itemType: ItemType.LifeSanctuary, active: true }) as IItem;

const makeFightSanctuary = (x = 2, y = 2): IItem => ({ x, y, size: SANCTUARY_SIZE, itemType: ItemType.FightSanctuary, active: true }) as IItem;

const makeFlag = (): IItem => ({ x: 1, y: 1, size: 1, itemType: ItemType.Flag }) as IItem;

describe('isSanctuaryItem', () => {
    it('returns true for LifeSanctuary — Nominal case', () => {
        expect(isSanctuaryItem(makeLifeSanctuary())).to.equal(true);
    });

    it('returns true for FightSanctuary — Nominal case', () => {
        expect(isSanctuaryItem(makeFightSanctuary())).to.equal(true);
    });

    it('returns false for a non-sanctuary item — Edge case', () => {
        expect(isSanctuaryItem(makeFlag())).to.equal(false);
    });

    it('returns false for null — Edge case', () => {
        expect(isSanctuaryItem(null)).to.equal(false);
    });

    it('returns false for undefined — Edge case', () => {
        expect(isSanctuaryItem(undefined)).to.equal(false);
    });
});

describe('sanctuaryCoversCell', () => {
    it('returns true for a cell inside the 2×2 sanctuary footprint — Nominal case', () => {
        const s = makeLifeSanctuary(2, 2);
        expect(sanctuaryCoversCell(s, 2, 2)).to.equal(true);
        expect(sanctuaryCoversCell(s, 2, THREE)).to.equal(true);
        expect(sanctuaryCoversCell(s, THREE, 2)).to.equal(true);
        expect(sanctuaryCoversCell(s, THREE, THREE)).to.equal(true);
    });

    it('returns false for a cell outside the footprint — Edge case', () => {
        const s = makeLifeSanctuary(2, 2);
        expect(sanctuaryCoversCell(s, 1, 2)).to.equal(false);
        expect(sanctuaryCoversCell(s, FOUR, FOUR)).to.equal(false);
    });

    it('returns false for a non-sanctuary item — Edge case', () => {
        expect(sanctuaryCoversCell(makeFlag(), 1, 1)).to.equal(false);
    });
});

describe('isPositionAdjacentToSanctuary', () => {
    it('returns true for a position directly to the left of the sanctuary — Nominal case', () => {
        const s = makeLifeSanctuary(2, 2);
        // x=1 is directly adjacent to the sanctuary's left edge.
        expect(isPositionAdjacentToSanctuary({ x: 1, y: 2 }, s)).to.equal(true);
    });

    it('returns true for a position directly to the right — Nominal case', () => {
        const s = makeLifeSanctuary(2, 2);
        // x=4 is directly adjacent to the sanctuary's right edge.
        expect(isPositionAdjacentToSanctuary({ x: 4, y: 2 }, s)).to.equal(true);
    });

    it('returns true for a position directly above — Nominal case', () => {
        const s = makeLifeSanctuary(2, 2);
        // y=1 is directly adjacent to the sanctuary's top edge.
        expect(isPositionAdjacentToSanctuary({ x: 2, y: 1 }, s)).to.equal(true);
    });

    it('returns true for a position directly below — Nominal case', () => {
        const s = makeLifeSanctuary(2, 2);
        // y=4 is directly adjacent to the sanctuary's bottom edge.
        expect(isPositionAdjacentToSanctuary({ x: 2, y: 4 }, s)).to.equal(true);
    });

    it('returns false for a non-adjacent position — Edge case', () => {
        const s = makeLifeSanctuary(2, 2);
        expect(isPositionAdjacentToSanctuary({ x: 0, y: 0 }, s)).to.equal(false);
    });

    it('returns false for a non-sanctuary item — Edge case', () => {
        expect(isPositionAdjacentToSanctuary({ x: 0, y: 0 }, makeFlag())).to.equal(false);
    });
});

describe('isSanctuaryActive', () => {
    it('returns true when active is explicitly true — Nominal case', () => {
        const s = makeLifeSanctuary();
        (s as IItem & { active: boolean }).active = true;
        expect(isSanctuaryActive(s)).to.equal(true);
    });

    it('returns false when active is false — Edge case', () => {
        const s = makeLifeSanctuary();
        (s as IItem & { active: boolean; inactiveTurnsRemaining: number }).active = false;
        (s as IItem & { active: boolean; inactiveTurnsRemaining: number }).inactiveTurnsRemaining = 2;
        expect(isSanctuaryActive(s)).to.equal(false);
    });

    it('returns false when active is false and inactiveTurnsRemaining is 0 — Edge case', () => {
        const s = makeLifeSanctuary();
        (s as IItem & { active: boolean; inactiveTurnsRemaining: number }).active = false;
        (s as IItem & { active: boolean; inactiveTurnsRemaining: number }).inactiveTurnsRemaining = 0;
        // Explicitly inactive sanctuaries stay inactive regardless of remaining turns.
        expect(isSanctuaryActive(s)).to.equal(false);
    });

    it('returns false for null — Edge case', () => {
        expect(isSanctuaryActive(null)).to.equal(false);
    });

    it('returns false for a non-sanctuary item — Edge case', () => {
        expect(isSanctuaryActive(makeFlag())).to.equal(false);
    });
});

describe('deactivateSanctuary', () => {
    it('sets active to false and inactiveTurnsRemaining to COOLDOWN — Nominal case', () => {
        const s = makeLifeSanctuary() as IItem & { active: boolean; inactiveTurnsRemaining: number };
        deactivateSanctuary(s);

        expect(s.active).to.equal(false);
        expect(s.inactiveTurnsRemaining).to.equal(SANCTUARY_COOLDOWN_TURN_STEPS);
    });

    it('does nothing for a non-sanctuary item — Edge case', () => {
        const flag = makeFlag();
        deactivateSanctuary(flag);
        // Non-sanctuary payloads should remain untouched.
        expect((flag as IItem & { active?: boolean }).active).to.equal(undefined);
    });
});

describe('advanceSanctuaryCooldowns', () => {
    it('reactivates a sanctuary when inactiveTurnsRemaining reaches 1 — Nominal case', () => {
        const s = makeLifeSanctuary() as IItem & { active: boolean; inactiveTurnsRemaining: number };
        s.active = false;
        s.inactiveTurnsRemaining = 1;

        advanceSanctuaryCooldowns([s]);

        expect(s.active).to.equal(true);
        expect(s.inactiveTurnsRemaining).to.equal(0);
    });

    it('decrements inactiveTurnsRemaining when > 1 — Nominal case', () => {
        const s = makeLifeSanctuary() as IItem & { active: boolean; inactiveTurnsRemaining: number };
        s.active = false;
        s.inactiveTurnsRemaining = 3;

        advanceSanctuaryCooldowns([s]);

        expect(s.active).to.equal(false);
        expect(s.inactiveTurnsRemaining).to.equal(2);
    });

    it('keeps an inactive sanctuary dormant when cooldown is already exhausted — Edge case', () => {
        const s = makeLifeSanctuary() as IItem & { active: boolean; inactiveTurnsRemaining: number };
        s.active = false;
        s.inactiveTurnsRemaining = 0;

        advanceSanctuaryCooldowns([s]);

        expect(s.active).to.equal(false);
        expect(s.inactiveTurnsRemaining).to.equal(0);
    });

    it('keeps an inactive sanctuary dormant when cooldown is undefined — Edge case', () => {
        const s = makeLifeSanctuary() as IItem & { active: boolean; inactiveTurnsRemaining?: number };
        s.active = false;
        delete s.inactiveTurnsRemaining;
        // Edge case: missing cooldown should be treated like an exhausted cooldown.
        advanceSanctuaryCooldowns([s]);

        expect(s.active).to.equal(false);
        expect(s.inactiveTurnsRemaining).to.equal(undefined);
    });

    it('skips active sanctuaries — Edge case', () => {
        const s = makeLifeSanctuary() as IItem & { active: boolean; inactiveTurnsRemaining: number };
        s.active = true;
        s.inactiveTurnsRemaining = 2;

        advanceSanctuaryCooldowns([s]);

        expect(s.inactiveTurnsRemaining).to.equal(2); // unchanged
    });

    it('skips non-sanctuary items — Edge case', () => {
        const flag = makeFlag();
        // should not throw
        advanceSanctuaryCooldowns([flag]);
    });

    it('handles empty array — Edge case', () => {
        advanceSanctuaryCooldowns([]);
    });
});
