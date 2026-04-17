/**
 * Testing strategy — Avatar path utilities
 *
 * Approach:
 * - Validate generated asset paths for standard and portrait variants.
 *
 * Edge cases covered:
 * - Portrait suffix handling is delegated by getImageForAvatar.
 */
import { buildAvatarAssetPath, getImageForAvatar } from '@app/utils/avatar-path';
import { Avatar } from '@common/constants';

describe('avatar-path utilities', () => {
    it('builds regular and portrait avatar asset paths', () => {
        // Nominal case
        expect(buildAvatarAssetPath(Avatar.Avatar1)).toBe('./assets/characters/archer.png');
        expect(buildAvatarAssetPath(Avatar.Avatar2, true)).toBe('./assets/characters/brick-portrait.png');
    });

    it('returns portrait path from getImageForAvatar', () => {
        // Edge case
        expect(getImageForAvatar(Avatar.Avatar12)).toBe('./assets/characters/wizard-portrait.png');
    });
});
