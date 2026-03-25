import { IBoard } from './board';

export enum GameType {
    Ctf = 'ctf',
    Classic = 'classic',
}

export const enum Visibility {
    Hidden = 'hidden',
    Viewable = 'viewable',
}

export interface IGame {
    gameTitle: string;
    description: string;
    gameMode: GameType;
    lastModifiedDate: Date;
    dateCreated: Date;
    visibility: Visibility;
    board: IBoard;
}

export interface IExistingGame extends IGame {
    _id: string;
}

export interface EditGameFormData {
    gameTitle: string;
    description: string;
    gameMode: GameType;
    board: IBoard;
}
