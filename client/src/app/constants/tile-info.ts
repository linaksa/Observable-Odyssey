import { CellType } from '@common/board';
import { PRIX_EAU, PRIX_GLACE, PRIX_PORTE_GAZON } from '@common/constants';
import { ItemInfoData, TileInfoData } from '@common/info';
import { ItemType } from '@common/items';

export const TILE_INFO_BY_TYPE: Record<CellType, TileInfoData> = {
    [CellType.Empty]: {
        title: 'Tuile de base',
        description: 'Terrain libre et traversable.',
        movementCost: `${PRIX_PORTE_GAZON} point de mouvement.`,
    },
    [CellType.Ice]: {
        title: 'Glace',
        description: 'Terrain traversable, mais glissant.',
        movementCost: `${PRIX_GLACE} point de mouvement.`,
    },
    [CellType.Water]: {
        title: 'Eau',
        description: 'Terrain traversable, mais lentement.',
        movementCost: `${PRIX_EAU} points de mouvement.`,
    },
    [CellType.OpenDoor]: {
        title: 'Porte ouverte',
        description: 'Peut être fermée pour bloquer le passage.',
        movementCost: `${PRIX_PORTE_GAZON} point de mouvement.`,
    },
    [CellType.ClosedDoor]: {
        title: 'Porte fermée',
        description: 'Peut être ouverte pour libérer le passage.',
        movementCost: 'Non traversable.',
    },
    [CellType.Wall]: {
        title: 'Mur',
        description: 'Obstacle infranchissable et immobile.',
        movementCost: 'Non traversable.',
    },
};

export const UNKNOWN_TILE_INFO: TileInfoData = {
    title: 'Tuile inconnue',
    description: 'Information indisponible.',
    movementCost: 'Inconnu.',
};

export const ITEM_INFO_BY_TYPE: Record<ItemType, ItemInfoData> = {
    [ItemType.LifeSanctuary]: {
        title: 'Sanctuaire de vie',
        description: 'Soigne le joueur de 2 points de vie.',
    },
    [ItemType.FightSanctuary]: {
        title: 'Sanctuaire de combat',
        description: "Donne un buff d'attaque et de défense.",
    },
    [ItemType.StartingPosition]: {
        title: 'Position de depart',
        description: "Case d'apparition d'un joueur.",
    },
    [ItemType.Flag]: {
        title: 'Drapeau',
        description: 'Objectif principal du mode CTF.',
    },
};

export const UNKNOWN_ITEM_INFO: TileInfoData = {
    title: 'Objet inconnu',
    description: 'Information indisponible.',
    movementCost: 'Inconnu.',
};
