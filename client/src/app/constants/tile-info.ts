import { CellType } from '@common/board';
import { PRIX_EAU, PRIX_GLACE, PRIX_PORTE_GAZON } from '@common/constants';
import { ItemInfoData, TileInfoData } from '@common/info';
import { ItemType } from '@common/items';

export const TILE_INFO_BY_TYPE: Record<CellType, TileInfoData> = {
    [CellType.Empty]: {
        title: 'Tuile de base :',
        description: 'Terrain libre et traversable.',
        movementCost: `${PRIX_PORTE_GAZON} point de mouvement.`,
        editorTooltip: 'Tuile de base.',
    },
    [CellType.Ice]: {
        title: 'Glace :',
        description: 'Terrain libre et traversable.',
        movementCost: `${PRIX_GLACE} point de mouvement.`,
        editorTooltip: 'Ne consomme aucun mouvement.',
    },
    [CellType.Water]: {
        title: 'Eau :',
        description: 'Terrain traversable, mais plus coûteux.',
        movementCost: `${PRIX_EAU} points de mouvement.`,
        editorTooltip: 'Consomme deux fois plus de mouvement.',
    },
    [CellType.OpenDoor]: {
        title: 'Porte ouverte :',
        description: 'La porte est traversable.',
        movementCost: `${PRIX_PORTE_GAZON} point de mouvement.`,
        editorTooltip: 'Une porte ouverte.',
    },
    [CellType.ClosedDoor]: {
        title: 'Porte fermée :',
        description: "Impossible de traverser tant qu'elle est fermée.",
        movementCost: 'Non traversable.',
        editorTooltip: 'Une porte fermée.',
    },
    [CellType.Wall]: {
        title: 'Mur :',
        description: 'Obstacle fixe.',
        movementCost: 'Non traversable.',
        editorTooltip: "N'est pas traversable.",
    },
};

export const UNKNOWN_TILE_INFO: TileInfoData = {
    title: 'Tuile inconnue :',
    description: 'Information indisponible.',
    movementCost: 'Inconnu.',
    editorTooltip: 'Tuile inconnue',
};

export const ITEM_INFO_BY_TYPE: Record<ItemType, ItemInfoData> = {
    [ItemType.LifeSanctuary]: {
        title: 'Sanctuaire de vie :',
        description: 'Soigne le joueur qui intéragit avec ce sanctuaire.',
        editorTooltip: 'Soigne le joueur.',
    },
    [ItemType.FightSanctuary]: {
        title: 'Sanctuaire de combat :',
        description: "Augmente les dégâts d'attaque du joueur qui interagit avec ce sanctuaire.",
        editorTooltip: "Augmente les dégâts d'attaque.",
    },
    [ItemType.StartingPosition]: {
        title: 'Position de depart :',
        description: "Case d'apparition d'un joueur.",
        editorTooltip: "Position d'apparition du joueur.",
    },
    [ItemType.Flag]: {
        title: 'Drapeau :',
        description: 'Objectif principal du mode CTF.',
        editorTooltip: 'Objectif pour le mode CTF.',
    },
};
