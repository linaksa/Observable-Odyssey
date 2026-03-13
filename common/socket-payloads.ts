import { Position } from './character';

export interface IJoinGamePayload {
    activeGameId: string;
    playerName?: string;
}

export interface IPlayerMoveData {
    gameId: string;
    playerId: string;
    direction: Position;
}

export interface IAttackData {
    gameId: string;
    attackerName: string;
    defenderName: string;
}

export interface IAbandonData {
    gameId: string;
    playerId: string;
}

export interface IDebugTeleportData {
    gameId: string;
    playerName: string;
    target: Position;
}

export interface ISocketData {
    playerNamesByGameId?: Record<string, string>;
}
