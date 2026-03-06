import { ICharacter } from './character';
import { IGame } from './game';
import { IItem } from './items';
import { IMessage } from './message';

export interface IActiveGame {
    _id: string;
    game: IGame;
    players: ICharacter[];
    itemsState: IItem[];
    currentPlayerIndex: number;
    messages: IMessage[];
    organizerName: string;
}
