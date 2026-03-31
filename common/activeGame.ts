import { AttackPosture } from './attackResult';
import { ICharacter } from './character';
import { IGame } from './game';
import { IMessage } from './message';

export interface IActiveGame {
    _id: string;
    game: IGame;
    createdAt?: Date;
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
    turnStartTimeStamp: number;

    currentAttack: ICurrentAttack | null;
}

export interface ICurrentAttack {
    attacker: string;
    defender: string;
    turnCount: number;

    suspendedTurnTimer: number;

    attackerPosture: AttackPosture | null;
    defenderPosture: AttackPosture | null;
}

export interface IActiveGameWithPlayer {
    activeGame: IActiveGame;
    player: ICharacter;
}
