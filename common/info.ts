
export interface TileInfoData {
    title: string;
    description: string;
    movementCost: string;
    editorTooltip: string;
}

export interface ItemInfoData {
    title: string;
    description: string;
    editorTooltip: string;
}

export type SanctuaryChoice = 'standard' | 'double';

export interface SanctuaryPopupData {
    visible: boolean;
    title: string;
    description: string;
    effectLabel: string;
}

export interface PlayerInfoData {
    name: string;
    avatarUrl: string;
}

export interface TileInfoPopupData {
    visible: boolean;
    title: string;
    description: string;
    movementCost: string;
    itemTitle: string | null;
    itemDescription: string | null;
    playerName: string | null;
    playerAvatarUrl: string | null;
}

export interface TurnStatusData {
    currentPlayerName: string | null;
    turnTimeLeftSeconds: number | null;
    isTurnPreparing: boolean;
    canEndTurn: boolean;
}
