import { AttackPosture } from './attackResult';
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

export interface IActionData {
    gameId: string;
    currentPlayerName: string;
    targetName: string;
}

export interface IFlagActionData {
    gameId: string;
    currentPlayerName: string;
    currentPlayerActionsLeft: number;
    targetPlayerName: string;
}

export interface IFlagDecisionData {
    gameId: string;
    newFlagCarrierName: string;
}

export interface IAttackPostureData {
    gameId: string;
    playerName: string;
    posture: AttackPosture;
}

export interface IStartTurnData {
    playerName: string;
    movementLeft: number;
    actionsLeft: number;
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

export interface IDebugToggleState {
    playerName: string;
    isDebugMode: boolean;
}

export interface ISocketData {
    playerNamesByGameId?: Record<string, string>;
}

export interface ITurnStartedPayload {
    player: string;
    movementLeft: number;
    actionLeft: number;
    timeLeft: number | null;
}

export interface IGameLogPayload {
    message: string;
    postedAt: string;
}
