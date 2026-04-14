import { AVATAR_ASSET_BASE_PATH, AVATAR_ASSET_NAME_BY_AVATAR } from '@app/constants/avatar';
import { Avatar } from '@common/constants';

export function buildAvatarAssetPath(avatar: Avatar, portrait = false): string {
    return `${AVATAR_ASSET_BASE_PATH}/${AVATAR_ASSET_NAME_BY_AVATAR[avatar]}${portrait ? '-portrait' : ''}.png`;
}

export function getImageForAvatar(avatar: Avatar): string {
    return buildAvatarAssetPath(avatar, true);
}
