import { ICharacter } from './character';
import { IGame } from './game';
import { IItem } from './items';
import { IMessage } from './message';

export interface IActiveGame {
    _id: string;
    game: IGame;
    players: ICharacter[];
    itemsState: IItem[]; // vraiment nécessaire ?
    currentPlayerIndex: number;
    turnOrder: string[]; // Liste des noms de joueurs dans l'ordre des tours
    isFinished: boolean;
    winner: string | null;
    messages: IMessage[];
    isDebugMode: boolean;
    organizerName: string;
    maxPlayerCount: number;
}

export interface IActiveGameWithPlayer {
    activeGame: IActiveGame;
    player: ICharacter;
}
