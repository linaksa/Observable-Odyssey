import { Injectable } from '@angular/core';
import { ITEM_INFO_BY_TYPE, TILE_INFO_BY_TYPE, UNKNOWN_TILE_INFO } from '@app/constants/tile-info';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { ItemInfoData, PlayerInfoData, TileInfoData } from '@common/info';
import { IItem } from '@common/items';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';

@Injectable({
    providedIn: 'root',
})
export class TileInfoService {
    getTileInfo(cellType: CellType): TileInfoData {
        return TILE_INFO_BY_TYPE[cellType] ?? UNKNOWN_TILE_INFO;
    }

    getItemInfo(item: IItem | null): ItemInfoData | null {
        if (!item) {
            return null;
        }

        return ITEM_INFO_BY_TYPE[item.itemType] ?? null;
    }

    getPlayerInfo(player: ICharacter | null): PlayerInfoData | null {
        if (!player) {
            return null;
        }

        return {
            name: player.name,
            avatarUrl: buildAvatarAssetPath(player.avatar, true),
        };
    }
}
