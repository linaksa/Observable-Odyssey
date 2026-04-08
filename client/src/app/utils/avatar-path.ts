import { Avatar } from '@common/constants';

const AVATAR_ASSET_BASE_PATH = './assets/characters';

const AVATAR_ASSET_NAME_BY_AVATAR: Record<Avatar, string> = {
    [Avatar.Avatar1]: 'archer',
    [Avatar.Avatar2]: 'brick',
    [Avatar.Avatar3]: 'cherry',
    [Avatar.Avatar4]: 'cocoa',
    [Avatar.Avatar5]: 'frost',
    [Avatar.Avatar6]: 'healer',
    [Avatar.Avatar7]: 'knight',
    [Avatar.Avatar8]: 'lavender',
    [Avatar.Avatar9]: 'lime',
    [Avatar.Avatar10]: 'shade',
    [Avatar.Avatar11]: 'spike',
    [Avatar.Avatar12]: 'wizard',
};

export function buildAvatarAssetPath(avatar: Avatar, portrait = false): string {
    return `${AVATAR_ASSET_BASE_PATH}/${AVATAR_ASSET_NAME_BY_AVATAR[avatar]}${portrait ? '-portrait' : ''}.png`;
}

export function getImageForAvatar(avatar: Avatar): string {
    return buildAvatarAssetPath(avatar, true);
}
