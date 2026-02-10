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
