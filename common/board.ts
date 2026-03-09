import { IItem } from './items';

export enum CellType {
    Empty = 'EMPTY',
    Ice = 'ICE',
    Water = 'WATER',
    Wall = 'WALL',
    OpenDoor = 'OPEN_DOOR',
    ClosedDoor = 'CLOSED_DOOR',
}

export interface IBoard {
    cells: CellType[][];
    items: IItem[];
}

export const BOARD_SIZE_TO_PLAYER_COUNT: Record<number, number> = {
    10: 2,
    15: 4,
    20: 6,
};
