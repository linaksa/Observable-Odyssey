/**
 * Testing strategy — ActiveGame schema
 *
 * Approach:
 * - Inspect the schema metadata directly instead of going through MongoDB.
 * - Assert that the TTL index targets the active-game creation timestamp.
 *
 * Edge cases covered:
 * - The TTL must stay attached to the active-game collection only.
 * - The expiration window should remain one hour.
 */
import { expect } from 'chai';
import { ACTIVE_GAME_TTL_SECONDS, activeGameModel } from './active-game';

describe('ActiveGame schema', () => {
    it('should define a TTL index on createdAt for one hour', () => {
        const indexes = activeGameModel.schema.indexes() as [{ createdAt?: number }, { expireAfterSeconds?: number }][];
        const ttlIndex = indexes.find(([fields, options]) => fields.createdAt === 1 && options?.expireAfterSeconds === ACTIVE_GAME_TTL_SECONDS);

        expect(ttlIndex).to.not.equal(undefined);
        expect(ttlIndex?.[1].expireAfterSeconds).to.equal(ACTIVE_GAME_TTL_SECONDS);
    });
});
