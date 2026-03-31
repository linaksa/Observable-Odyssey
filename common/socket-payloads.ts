import { AttackPosture } from './attackResult';
import { CellType } from './board';
import { Position } from './character';
import { SanctuaryChoice } from './info';
import { ItemType } from './items';

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

export interface IDoorToggleData {
    gameId: string;
    playerId: string;
    position: Position;
}

export interface IDoorToggledResult {
    playerId: string;
    position: Position;
    cellType: CellType;
    actionsLeft: number;
}

export interface ISanctuaryInteractionData {
    gameId: string;
    playerId: string;
    position: Position;
    choice: SanctuaryChoice;
}

export interface ISanctuaryInteractedResult {
    playerId: string;
    position: Position;
    itemType: ItemType.LifeSanctuary | ItemType.FightSanctuary;
    choice: SanctuaryChoice;
    succeeded: boolean;
    actionsLeft: number;
    currentHealth: number;
    attackPoints: number;
    defensePoints: number;
    sanctuaryActive: boolean;
    sanctuaryInactiveTurnsRemaining: number;
    fightSanctuaryUsed?: boolean;
    fightSanctuaryTurnsRemaining?: number;
    fightSanctuaryBonus?: number;
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
