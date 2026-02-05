import { CellType } from '@common/board';
import { ItemType } from '@common/items';

export const CELL_TYPE_BACKGROUNDS: { [key in CellType]: string } = {
    [CellType.Empty]: 'bg-[url("/assets/edit-page/sprites/grass.png")]',
    [CellType.Ice]: 'bg-[url("/assets/edit-page/sprites/ice.png")]',
    [CellType.Water]: 'bg-[url(/assets/edit-page/sprites/water.png)]',
    [CellType.Wall]: 'bg-[url(/assets/edit-page/sprites/wall.png)]',
    [CellType.OpenDoor]: 'bg-[url(/assets/edit-page/sprites/openedDoor.png)]',
    [CellType.ClosedDoor]: 'bg-[url(/assets/edit-page/sprites/closedDoor.png)]',
};

export const OBJECT_IMAGES: { [key in ItemType]: string } = {
    [ItemType.LifeSanctuary]: 'bg-[url(/assets/edit-page/sprites/healSanctuary.png)] bg-size-[200%_200%]',
    [ItemType.FightSanctuary]: 'bg-[url(/assets/edit-page/sprites/fightSanctuary.png)] bg-size-[200%_200%]',
    [ItemType.StartingPosition]: 'bg-[url(/assets/edit-page/sprites/spawnpoint.png)] bg-cover',
    [ItemType.Flag]: 'bg-[url(/assets/edit-page/sprites/flag.png)] bg-[length:100%_100%]',
};
