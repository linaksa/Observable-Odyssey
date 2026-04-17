/**
 * Testing strategy — ActiveGame schema
 *
 * Approach:
 * - Inspect mongoose schema metadata directly (no DB round trip).
 * - Assert index/path metadata for lifecycle cleanup and optional deletion markers.
 *
 * Edge cases covered:
 * - TTL expiration stays bound to `createdAt` with configured one-hour retention.
 * - `markedForDeletionAt` remains a nullable Date field by default.
 */
import { expect } from 'chai';
import { ACTIVE_GAME_TTL_SECONDS, activeGameModel } from '@app/schemas/active-game';

describe('ActiveGame schema', () => {
    it('should define a TTL index on createdAt for one hour', () => {
        const indexes = activeGameModel.schema.indexes() as [{ createdAt?: number }, { expireAfterSeconds?: number }][];
        const ttlIndex = indexes.find(([fields, options]) => fields.createdAt === 1 && options?.expireAfterSeconds === ACTIVE_GAME_TTL_SECONDS);

        expect(ttlIndex).to.not.equal(undefined);
        expect(ttlIndex?.[1].expireAfterSeconds).to.equal(ACTIVE_GAME_TTL_SECONDS);
    });

    it('should include markedForDeletionAt as a Date field with a default null value', () => {
        const markedForDeletionPath = activeGameModel.schema.path('markedForDeletionAt');

        expect(markedForDeletionPath).to.not.equal(undefined);
        expect(markedForDeletionPath.instance).to.equal('Date');
        expect(markedForDeletionPath.options.default).to.equal(null);
    });
});
