import { CellType } from '@common/board';
import { ItemType } from '@common/items';

export const CELL_TYPE_BACKGROUNDS: { [key in CellType]: string } = {
    [CellType.Grass]: 'bg-[url("/assets/edit-page/sprites/grass.png")]',
    [CellType.Ice]: 'bg-[url("/assets/edit-page/sprites/ice.png")]',
    [CellType.Water]: 'bg-[url(/assets/edit-page/sprites/water.png)]',
    [CellType.Wall]: 'bg-[url(/assets/edit-page/sprites/wall.png)]',
    [CellType.OpenDoor]: 'bg-[url(/assets/edit-page/sprites/openedDoor.png)]',
    [CellType.ClosedDoor]: 'bg-[url(/assets/edit-page/sprites/closedDoor.png)]',
};

export const CELL_TYPE_IMAGE_PATHS: { [key in CellType]: string } = {
    [CellType.Grass]: '/assets/edit-page/sprites/grass.png',
    [CellType.Ice]: '/assets/edit-page/sprites/ice.png',
    [CellType.Water]: '/assets/edit-page/sprites/water.png',
    [CellType.Wall]: '/assets/edit-page/sprites/wall.png',
    [CellType.OpenDoor]: '/assets/edit-page/sprites/openedDoor.png',
    [CellType.ClosedDoor]: '/assets/edit-page/sprites/closedDoor.png',
};

export const CELL_TYPE_DESCRIPTION: { [key in CellType]: string } = {
    [CellType.Grass]: 'court descriptif de la tuile à placer en survolant son outil avec la souris',
    [CellType.Ice]: 'court descriptif de la tuile à placer en survolant son outil avec la souris',
    [CellType.Water]: 'court descriptif de la tuile à placer en survolant son outil avec la souris',
    [CellType.Wall]: 'court descriptif de la tuile à placer en survolant son outil avec la souris',
    [CellType.OpenDoor]: 'court descriptif de la tuile à placer en survolant son outil avec la souris',
    [CellType.ClosedDoor]: 'court descriptif de la tuile à placer en survolant son outil avec la souris',
};

export const OBJECT_IMAGES: { [key in ItemType]: string } = {
    [ItemType.LifeSanctuary]: 'bg-[url(/assets/edit-page/sprites/healSanctuary.png)] bg-size-[200%_200%]',
    [ItemType.FightSanctuary]: 'bg-[url(/assets/edit-page/sprites/fightSanctuary.png)] bg-size-[200%_200%]',
    [ItemType.StartingPosition]: 'bg-[url(/assets/edit-page/sprites/spawnpoint.png)] bg-cover',
    [ItemType.Flag]: 'bg-[url(/assets/edit-page/sprites/flag.png)] bg-[length:100%_100%]',
};

export const OBJECT_TYPE_IMAGE_PATHS: { [key in ItemType]: string } = {
    [ItemType.LifeSanctuary]: '/assets/edit-page/sprites/healSanctuary.png',
    [ItemType.FightSanctuary]: '/assets/edit-page/sprites/fightSanctuary.png',
    [ItemType.StartingPosition]: '/assets/edit-page/sprites/spawnpoint.png',
    [ItemType.Flag]: '/assets/edit-page/sprites/flag.png',
};
