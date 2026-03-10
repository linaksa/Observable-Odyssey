import { CellType } from '@common/board';
import { ItemType } from '@common/items';

export const CELL_TYPE_PATHS: { [key in CellType]: string } = {
    [CellType.Empty]: './assets/edit-page/sprites/grass.png',
    [CellType.Ice]: './assets/edit-page/sprites/ice.png',
    [CellType.Water]: './assets/edit-page/sprites/water.png',
    [CellType.Wall]: './assets/edit-page/sprites/wall.png',
    [CellType.OpenDoor]: './assets/edit-page/sprites/openedDoor.png',
    [CellType.ClosedDoor]: './assets/edit-page/sprites/closedDoor.png',
};

export const CELL_TYPE_BACKGROUNDS: { [key in CellType]: string } = {
    [CellType.Empty]: 'bg-[url(./assets/edit-page/sprites/grass.png)]',
    [CellType.Ice]: 'bg-[url(./assets/edit-page/sprites/ice.png)]',
    [CellType.Water]: 'bg-[url(./assets/edit-page/sprites/water.png)]',
    [CellType.Wall]: 'bg-[url(./assets/edit-page/sprites/wall.png)]',
    [CellType.OpenDoor]: 'bg-[url(./assets/edit-page/sprites/openedDoor.png)]',
    [CellType.ClosedDoor]: 'bg-[url(./assets/edit-page/sprites/closedDoor.png)]',
};

export const ITEM_TYPE_PATHS: { [key in ItemType]: string } = {
    [ItemType.LifeSanctuary]: './assets/edit-page/sprites/healSanctuary.png',
    [ItemType.FightSanctuary]: './assets/edit-page/sprites/fightSanctuary.png',
    [ItemType.StartingPosition]: './assets/edit-page/sprites/spawnpoint.png',
    [ItemType.Flag]: './assets/edit-page/sprites/flag.png',
};

export const ITEM_TYPE_PATHS: { [key in ItemType]: string } = {
    [ItemType.LifeSanctuary]: '/assets/edit-page/sprites/healSanctuary.png',
    [ItemType.FightSanctuary]: '/assets/edit-page/sprites/fightSanctuary.png',
    [ItemType.StartingPosition]: '/assets/edit-page/sprites/spawnpoint.png',
    [ItemType.Flag]: '/assets/edit-page/sprites/flag.png',
};

export const OBJECT_IMAGES: { [key in ItemType]: string } = {
    [ItemType.LifeSanctuary]: 'bg-[url(./assets/edit-page/sprites/healSanctuary.png)]',
    [ItemType.FightSanctuary]: 'bg-[url(./assets/edit-page/sprites/fightSanctuary.png)]',
    [ItemType.StartingPosition]: 'bg-[url(./assets/edit-page/sprites/spawnpoint.png)]',
    [ItemType.Flag]: 'bg-[url(./assets/edit-page/sprites/flag.png)]',
};

export const OBJECT_SPECIFIC_CLASSES: { [key in ItemType]: string } = {
    [ItemType.LifeSanctuary]: 'bg-size-[200%_200%]',
    [ItemType.FightSanctuary]: 'bg-size-[200%_200%]',
    [ItemType.StartingPosition]: 'bg-cover',
    [ItemType.Flag]: 'bg-[length:100%_100%]',
};
