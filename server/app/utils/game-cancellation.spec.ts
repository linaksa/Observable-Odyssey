/**
 * Testing strategy — toGameCanceledReason
 *
 * Approach:
 * - Validate direct passthrough for each cancellation EndGameReason.
 * - Validate non-cancellation reasons collapse to `undefined`.
 *
 * Edge cases covered:
 * - Victory-only reasons (`combat-victories`, `ctf-flag-returned`) return `undefined`.
 * - Null input safely returns `undefined`.
 */
import { toGameCanceledReason } from '@app/utils/game-cancellation';
import { expect } from 'chai';

describe('toGameCanceledReason', () => {
    it('maps insufficient-active-players to itself — Nominal case', () => {
        expect(toGameCanceledReason('insufficient-active-players')).to.equal('insufficient-active-players');
    });

    it('maps no-human-players to itself — Nominal case', () => {
        expect(toGameCanceledReason('no-human-players')).to.equal('no-human-players');
    });

    it('maps ctf-team-eliminated to itself — Nominal case', () => {
        expect(toGameCanceledReason('ctf-team-eliminated')).to.equal('ctf-team-eliminated');
    });

    it('returns undefined for a victory reason — Edge case', () => {
        expect(toGameCanceledReason('combat-victories')).to.equal(undefined);
    });

    it('returns undefined for ctf-flag-returned — Edge case', () => {
        expect(toGameCanceledReason('ctf-flag-returned')).to.equal(undefined);
    });

    it('returns undefined for null — Edge case', () => {
        expect(toGameCanceledReason(null)).to.equal(undefined);
    });
});
