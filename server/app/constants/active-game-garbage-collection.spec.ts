/**
 * Testing strategy — active-game garbage collection constants
 *
 * Approach:
 * - Assert the exported sweep interval and grace period values directly.
 * - Keep the test focused on the constant module so the file is counted in coverage.
 */
import { MILLISECONDS_PER_SECOND, SECONDS_PER_MINUTE } from '@common/constants';
import { ACTIVE_GAME_SWEEP_GRACE_PERIOD_MS, ACTIVE_GAME_SWEEP_INTERVAL_MS } from '@app/constants/active-game-garbage-collection';
import { expect } from 'chai';

describe('active-game-garbage-collection constants', () => {
    it('exports the expected sweep interval and grace period', () => {
        const oneMinuteMs = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

        expect(ACTIVE_GAME_SWEEP_INTERVAL_MS).to.equal(oneMinuteMs);
        expect(ACTIVE_GAME_SWEEP_GRACE_PERIOD_MS).to.equal(2 * oneMinuteMs);
    });
});
