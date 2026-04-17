/**
 * Testing strategy — Sanctuary utilities
 *
 * Approach:
 * - Verify sanctuary type guards, adjacency checks, and cooldown transitions.
 * - Assert non-sanctuary items are ignored by sanctuary-specific operations.
 *
 * Edge cases covered:
 * - Stale cooldown data on active sanctuaries remains considered active.
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
import { IItem, ItemType } from '@common/items';

const FOUR = 4;
const FIVE = 5;
const SIX = 6;
const SEVEN = 7;

describe('sanctuary utilities', () => {
    it('detects sanctuary item kinds', () => {
        // Nominal case
        expect(isSanctuaryItem(createSanctuary(ItemType.LifeSanctuary))).toBeTrue();
        expect(isSanctuaryItem(createSanctuary(ItemType.FightSanctuary))).toBeTrue();
        expect(isSanctuaryItem(createRegularItem())).toBeFalse();
        expect(isSanctuaryItem(null)).toBeFalse();
        expect(isSanctuaryItem(undefined)).toBeFalse();
    });

    it('detects sanctuary footprint and adjacency around its 2x2 area', () => {
        // Nominal case
        const sanctuary = createSanctuary(ItemType.LifeSanctuary, { x: FOUR, y: FIVE });

        expect(sanctuaryCoversCell(sanctuary, FIVE, FOUR)).toBeTrue();
        expect(sanctuaryCoversCell(sanctuary, SIX, FIVE)).toBeTrue();
        expect(sanctuaryCoversCell(sanctuary, SEVEN, SIX)).toBeFalse();
        expect(sanctuaryCoversCell(createRegularItem(), FIVE, FOUR)).toBeFalse();

        expect(isPositionAdjacentToSanctuary({ x: 3, y: 5 }, sanctuary)).toBeTrue();
        expect(isPositionAdjacentToSanctuary({ x: 6, y: 6 }, sanctuary)).toBeTrue();
        expect(isPositionAdjacentToSanctuary({ x: 4, y: 4 }, sanctuary)).toBeTrue();
        expect(isPositionAdjacentToSanctuary({ x: 4, y: 7 }, sanctuary)).toBeTrue();
        expect(isPositionAdjacentToSanctuary({ x: 8, y: 8 }, sanctuary)).toBeFalse();
        expect(isPositionAdjacentToSanctuary({ x: 3, y: 5 }, createRegularItem())).toBeFalse();
    });

    it('handles sanctuary active/inactive state checks', () => {
        // Edge case
        expect(isSanctuaryActive(createRegularItem())).toBeFalse();
        expect(isSanctuaryActive(createSanctuary(ItemType.FightSanctuary, { active: false, inactiveTurnsRemaining: 2 }))).toBeFalse();
        expect(isSanctuaryActive(createSanctuary(ItemType.FightSanctuary, { active: true, inactiveTurnsRemaining: 2 }))).toBeTrue();
        expect(isSanctuaryActive(createSanctuary(ItemType.FightSanctuary, { active: true, inactiveTurnsRemaining: 0 }))).toBeTrue();
        expect(isSanctuaryActive(createSanctuary(ItemType.FightSanctuary, { active: undefined, inactiveTurnsRemaining: undefined }))).toBeTrue();
    });

    it('deactivates sanctuaries with configured cooldown and ignores regular items', () => {
        // Nominal case
        const sanctuary = createSanctuary(ItemType.LifeSanctuary, { active: true });
        const regular = createRegularItem();

        deactivateSanctuary(sanctuary);
        deactivateSanctuary(regular);

        expect(sanctuary.active).toBeFalse();
        expect(sanctuary.inactiveTurnsRemaining).toBe(SANCTUARY_COOLDOWN_TURN_STEPS);
        expect(regular.active).toBeUndefined();
    });

    it('advances sanctuary cooldowns until reactivation', () => {
        // Nominal case
        const reactivating = createSanctuary(ItemType.FightSanctuary, { active: false, inactiveTurnsRemaining: 1 });
        const countingDown = createSanctuary(ItemType.LifeSanctuary, { active: false, inactiveTurnsRemaining: 3 });
        const alreadyActive = createSanctuary(ItemType.FightSanctuary, { active: true, inactiveTurnsRemaining: 5 });
        const noCooldown = createSanctuary(ItemType.LifeSanctuary, { active: false, inactiveTurnsRemaining: 0 });
        const regular = createRegularItem();

        advanceSanctuaryCooldowns([reactivating, countingDown, alreadyActive, noCooldown, regular]);

        expect(reactivating.active).toBeTrue();
        expect(reactivating.inactiveTurnsRemaining).toBe(0);

        expect(countingDown.active).toBeFalse();
        expect(countingDown.inactiveTurnsRemaining).toBe(2);

        expect(alreadyActive.active).toBeTrue();
        expect(alreadyActive.inactiveTurnsRemaining).toBe(FIVE);

        expect(noCooldown.active).toBeFalse();
        expect(noCooldown.inactiveTurnsRemaining).toBe(0);
    });

    it('treats undefined cooldown as zero while advancing sanctuaries', () => {
        // Edge case: nullish cooldown should fallback to 0 in cooldown computation.
        const undefinedCooldown = createSanctuary(ItemType.LifeSanctuary, { active: undefined, inactiveTurnsRemaining: undefined });

        advanceSanctuaryCooldowns([undefinedCooldown]);

        expect(undefinedCooldown.active).toBeUndefined();
        expect(undefinedCooldown.inactiveTurnsRemaining).toBeUndefined();
    });

    function createSanctuary(itemType: ItemType.LifeSanctuary | ItemType.FightSanctuary, overrides: Partial<IItem> = {}): IItem {
        return {
            itemType,
            x: 1,
            y: 2,
            size: 4,
            active: true,
            inactiveTurnsRemaining: 0,
            ...overrides,
        };
    }

    function createRegularItem(): IItem {
        return {
            itemType: ItemType.Flag,
            x: 1,
            y: 2,
            size: 1,
            isCarried: false,
        };
    }
});
