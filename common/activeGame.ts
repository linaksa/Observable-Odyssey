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
    isDebugMode: boolean;
    organizerName: string;
    maxPlayerCount: number;
}

export interface IActiveGameWithPlayer {
    activeGame: IActiveGame;
    player: ICharacter;
}
