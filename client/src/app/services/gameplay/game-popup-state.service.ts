import { inject, Injectable } from '@angular/core';
import { ICharacter } from '@common/character';
import { TileInfoService } from '@app/services/ui/tile-info.service';
import { CellType } from '@common/board';
import { SanctuaryPopupData, TileInfoPopupData } from '@common/info';
import { IItem, ItemType } from '@common/items';

@Injectable({
    providedIn: 'root',
})
export class GamePopupStateService {
    private readonly tileInfoService = inject(TileInfoService);

    private isTileInfoVisible = false;
    private tileInfoTitle = '';
    private tileInfoDescription = '';
    private tileInfoMovementCost = '';
    private tileInfoItemTitle: string | null = null;
    private tileInfoItemDescription: string | null = null;
    private tileInfoPlayerName: string | null = null;
    private tileInfoPlayerAvatarUrl: string | null = null;

    isSanctuaryPopupVisible = false;
    sanctuaryPopupTitle = '';
    sanctuaryPopupDescription = '';
    sanctuaryPopupEffectLabel = '';
    sanctuaryPopupPosition: { x: number; y: number } | null = null;

    get tileInfoPopupData(): TileInfoPopupData {
        return {
            visible: this.isTileInfoVisible,
            title: this.tileInfoTitle,
            description: this.tileInfoDescription,
            movementCost: this.tileInfoMovementCost,
            itemTitle: this.tileInfoItemTitle,
            itemDescription: this.tileInfoItemDescription,
            playerName: this.tileInfoPlayerName,
            playerAvatarUrl: this.tileInfoPlayerAvatarUrl,
        };
    }

    get sanctuaryPopupData(): SanctuaryPopupData {
        return {
            visible: this.isSanctuaryPopupVisible,
            title: this.sanctuaryPopupTitle,
            description: this.sanctuaryPopupDescription,
            effectLabel: this.sanctuaryPopupEffectLabel,
        };
    }

    openTileInfo(cellType: CellType, item: IItem | null, player: ICharacter | null): void {
        const tileInfo = this.tileInfoService.getTileInfo(cellType);
        this.tileInfoTitle = tileInfo.title;
        this.tileInfoDescription = tileInfo.description;
        this.tileInfoMovementCost = tileInfo.movementCost;
        const itemInfo = this.tileInfoService.getItemInfo(item);
        this.tileInfoItemTitle = itemInfo?.title ?? null;
        this.tileInfoItemDescription = itemInfo?.description ?? null;
        const playerInfo = this.tileInfoService.getPlayerInfo(player);
        this.tileInfoPlayerName = playerInfo?.name ?? null;
        this.tileInfoPlayerAvatarUrl = playerInfo?.avatarUrl ?? null;
        this.isTileInfoVisible = true;
    }

    openSanctuaryPopup(item: IItem, rowIndex: number, colIndex: number): void {
        const itemInfo = this.tileInfoService.getItemInfo(item);
        this.closeTileInfo();
        this.sanctuaryPopupTitle = itemInfo?.title ?? 'Sanctuaire';
        this.sanctuaryPopupDescription = itemInfo?.description ?? 'Choisissez un bonus.';
        this.sanctuaryPopupEffectLabel = this.getSanctuaryEffectLabel(item);
        this.sanctuaryPopupPosition = { x: colIndex, y: rowIndex };
        this.isSanctuaryPopupVisible = true;
    }

    closeTileInfo(): void {
        this.isTileInfoVisible = false;
        this.tileInfoItemTitle = null;
        this.tileInfoItemDescription = null;
        this.tileInfoPlayerName = null;
        this.tileInfoPlayerAvatarUrl = null;
    }

    closeSanctuaryPopup(): void {
        this.isSanctuaryPopupVisible = false;
        this.sanctuaryPopupTitle = '';
        this.sanctuaryPopupDescription = '';
        this.sanctuaryPopupEffectLabel = '';
        this.sanctuaryPopupPosition = null;
    }

    closeAllPopups(): void {
        this.closeTileInfo();
        this.closeSanctuaryPopup();
    }

    private getSanctuaryEffectLabel(item: IItem): string {
        if (item.itemType === ItemType.LifeSanctuary) {
            return 'Soigne 2 PV, ou 4 PV si le 2x réussit.';
        }

        return 'Ajoute +1 ATQ / +1 DEF, ou +2 / +2 si le 2x réussit.';
    }
}
