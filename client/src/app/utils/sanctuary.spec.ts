/**
 * Testing strategy — Sanctuary Utilities
 *
 * Approach:
 * - Keep the checks narrow and focused on item availability semantics.
 * - Verify a used sanctuary becomes active again after the cooldown expires.
 */
import { sanctuaryCoversCell, isSanctuaryActive, advanceSanctuaryCooldowns } from './sanctuary';
import { IItem, ItemType } from '@common/items';

describe('sanctuary utilities', () => {
    const SANCTUARY_ROW = 3;
    const SANCTUARY_COLUMN = 4;

    it('should keep an inactive sanctuary unavailable until the cooldown expires', () => {
        const sanctuary = createSanctuary({ active: false, inactiveTurnsRemaining: 2 });

        expect(isSanctuaryActive(sanctuary)).toBeFalse();

        advanceSanctuaryCooldowns([sanctuary]);

        expect(sanctuary.active).toBeFalse();
        expect(sanctuary.inactiveTurnsRemaining).toBe(1);
        expect(isSanctuaryActive(sanctuary)).toBeFalse();

        advanceSanctuaryCooldowns([sanctuary]);

        expect(sanctuary.active).toBeTrue();
        expect(sanctuary.inactiveTurnsRemaining).toBe(0);
        expect(isSanctuaryActive(sanctuary)).toBeTrue();
    });

    it('should still recognize the sanctuary footprint', () => {
        const sanctuary = createSanctuary();

        expect(sanctuaryCoversCell(sanctuary, SANCTUARY_ROW, SANCTUARY_COLUMN)).toBeTrue();
    });

    it('should treat an active sanctuary as available even with stale cooldown state', () => {
        const sanctuary = createSanctuary({ active: true, inactiveTurnsRemaining: 1 });

        expect(isSanctuaryActive(sanctuary)).toBeTrue();
    });

    function createSanctuary(overrides: Partial<IItem> = {}): IItem {
        return {
            itemType: ItemType.FightSanctuary,
            x: SANCTUARY_COLUMN,
            y: SANCTUARY_ROW,
            size: 4,
            active: true,
            ...overrides,
        };
    }
});
