import { CellType } from '@common/board';
import { ItemType } from '@common/items';

export const CELL_TYPE_PATHS: { [key in CellType]: string } = {
    [CellType.Empty]: './assets/objects/grass.png',
    [CellType.Ice]: './assets/objects/ice.png',
    [CellType.Water]: './assets/objects/water.png',
    [CellType.Wall]: './assets/objects/wall.png',
    [CellType.OpenDoor]: './assets/objects/openedDoor.png',
    [CellType.ClosedDoor]: './assets/objects/closedDoor.png',
};

export const CELL_TYPE_BACKGROUNDS: { [key in CellType]: string } = {
    [CellType.Empty]: 'bg-[url(./assets/objects/grass.png)]',
    [CellType.Ice]: 'bg-[url(./assets/objects/ice.png)]',
    [CellType.Water]: 'bg-[url(./assets/objects/water.png)]',
    [CellType.Wall]: 'bg-[url(./assets/objects/wall.png)]',
    [CellType.OpenDoor]: 'bg-[url(./assets/objects/openedDoor.png)]',
    [CellType.ClosedDoor]: 'bg-[url(./assets/objects/closedDoor.png)]',
};

export const ITEM_TYPE_PATHS: { [key in ItemType]: string } = {
    [ItemType.LifeSanctuary]: './assets/objects/healSanctuary.png',
    [ItemType.FightSanctuary]: './assets/objects/fightSanctuary.png',
    [ItemType.StartingPosition]: './assets/objects/spawnpoint.png',
    [ItemType.Flag]: './assets/objects/flag.png',
};

export const OBJECT_IMAGES: { [key in ItemType]: string } = {
    [ItemType.LifeSanctuary]: 'bg-[url(./assets/objects/healSanctuary.png)]',
    [ItemType.FightSanctuary]: 'bg-[url(./assets/objects/fightSanctuary.png)]',
    [ItemType.StartingPosition]: 'bg-[url(./assets/objects/spawnpoint.png)]',
    [ItemType.Flag]: 'bg-[url(./assets/objects/flag.png)]',
};

export const OBJECT_SPECIFIC_CLASSES: { [key in ItemType]: string } = {
    [ItemType.LifeSanctuary]: 'bg-size-[200%_200%]',
    [ItemType.FightSanctuary]: 'bg-size-[200%_200%]',
    [ItemType.StartingPosition]: 'bg-cover',
    [ItemType.Flag]: 'bg-[length:100%_100%]',
};
