import { ICharacter } from './character';
import { IGame } from './game';
import { IItem } from './items';
import { IMessage } from './message';

export interface IActiveGame {
    game: IGame;
    players: ICharacter[];
    itemsState: IItem[];
    messages: IMessage[];
}
