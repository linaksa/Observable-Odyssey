import { ICharacter } from './character';
import { IGame } from './game';
import { IMessage } from './message';

export interface IActiveGame {
    _id: string;
    game: IGame;
    players: ICharacter[];
    currentPlayerIndex: number;
    turnOrder: string[]; // List of player names in turn order
    isFinished: boolean;
    winner: string | null;
    messages: IMessage[];
    isDebugMode: boolean;
    organizerName: string;
    maxPlayerCount: number;
    turnIsInPreparation: boolean;
    hasFlagId: string | null;
}

export interface IActiveGameWithPlayer {
    activeGame: IActiveGame;
    player: ICharacter;
}
