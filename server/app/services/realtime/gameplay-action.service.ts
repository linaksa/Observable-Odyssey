import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { AppError } from '@app/error-types/app-error';
import { GameplayServices } from '@app/services/gameplay/gameplay-dependencies.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { TEMPS_COMBAT } from '@common/constants';
import { ItemType } from '@common/items';
import { PlayerMovedResult } from '@common/playerMovedResult';
import { SocketEvent } from '@common/socket-events';
import {
    IAbandonData,
    IActionData,
    IAttackPostureData,
    IDoorToggleData,
    IDoorToggledResult,
    IFlagDecisionData,
    IGameLogPayload,
    IPlayerMoveData,
    ISanctuaryInteractedResult,
    ISanctuaryInteractionData,
} from '@common/socket-payloads';
import { Namespace, Socket } from 'socket.io';
import { Service } from 'typedi';
import { GameSessionService } from './game-session.service';

interface PendingFlagRequest {
    requesterName: string;
    targetPlayerName: string;
}
@Service()
export class GameplayActionService {
    private pendingFlagRequestsByGameId: Map<string, PendingFlagRequest> = new Map();
    constructor(
        private readonly gameplayService: GameplayServices,
        private readonly gameSessionService: GameSessionService,
        private readonly activeGameService: ActiveGameService,
    ) {}
    async handleEndTurn(gameId: string): Promise<void> {
        this.pendingFlagRequestsByGameId.delete(gameId);
        await this.gameplayService.turnService.endTurn(gameId);
        this.pendingFlagRequestsByGameId.delete(gameId);
    }

    async handlePlayerAbandon(data: IAbandonData, namespace: Namespace, socket: Socket): Promise<void> {
        await this.gameSessionService.handlePlayerAbandon(data, namespace, socket, this.emitGameLogToRoom.bind(this));
        const gameId = data.gameId;
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) {
            return;
        }
        const gameEnded = await this.gameplayService.endGameService.checkEndGame(gameId);
        if (gameEnded) {
            this.pendingFlagRequestsByGameId.delete(gameId);
        }
    }

    async handlePlayerMove(data: IPlayerMoveData, socket: Socket, namespace: Namespace): Promise<void> {
        const { gameId, playerId, direction } = data;
        try {
            const { newPosition, movementLeft } = await this.gameplayService.movementService.movePlayer(playerId, gameId, direction);
            namespace.to(gameId).emit(SocketEvent.PlayerMoved, { playerId, newPosition, movementLeft } as PlayerMovedResult);

            const reachable = await this.gameplayService.movementService.getReachablePositions(playerId, gameId);
            const canAttackAnyPlayer = await this.gameplayService.actionService.canUseActionAnyPlayer(gameId, playerId);
            if (reachable.length === 0 && !canAttackAnyPlayer) {
                await this.gameplayService.turnService.endTurn(gameId);
            }
            const gameEnded = await this.gameplayService.endGameService.checkEndGame(gameId);
            if (gameEnded) {
                const endedGame = await this.activeGameService.getActiveGameById(gameId);
                namespace.to(gameId).emit(SocketEvent.GameEnded, { winner: endedGame.winner });
                await this.activeGameService.deleteGameById(gameId);
            }
        } catch (error) {
            socket.emit(SocketEvent.PlayerMoveError, this.toSocketError(error, ErrorCode.PositionNotWalkable));
        }
    }

    async handleToggleDoor(
        data: IDoorToggleData,
        socket: Socket,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        const { gameId, playerId, position } = data;
        try {
            const result: IDoorToggledResult = await this.gameplayService.doorService.toggleDoor(playerId, gameId, position);
            namespace.to(gameId).emit(SocketEvent.DoorToggled, result);
            emitGameLog(gameId, `${playerId} a ${result.cellType === CellType.OpenDoor ? 'ouvert' : 'fermé'} une porte.`);

            await this.checkEndTurnIfNoMovesLeft(gameId, playerId);
        } catch (error) {
            socket.emit(SocketEvent.DoorToggleError, this.toSocketError(error, ErrorCode.InvalidDoorTarget));
        }
    }

    async handleSanctuaryInteraction(
        data: ISanctuaryInteractionData,
        socket: Socket,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        const { gameId, playerId, position, choice } = data;
        try {
            const result: ISanctuaryInteractedResult = await this.gameplayService.sanctuaryService.interactSanctuary(playerId, gameId, {
                position,
                choice,
            });
            namespace.to(gameId).emit(SocketEvent.SanctuaryInteracted, result);
            const sanctuaryKind = result.itemType === ItemType.LifeSanctuary ? 'vie' : 'combat';
            emitGameLog(gameId, `${playerId} a utilisé un sanctuaire de ${sanctuaryKind}.`);

            await this.checkEndTurnIfNoMovesLeft(gameId, playerId);
        } catch (error) {
            socket.emit(SocketEvent.SanctuaryInteractionError, this.toSocketError(error, ErrorCode.InvalidSanctuaryTarget));
        }
    }

    private async combatManager(gameId: string, attackerName: string, defenderName: string, namespace: Namespace): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const result = await this.activeGameService.startCombat(gameId, attackerName, defenderName);
        this.gameplayService.turnService.suspendTurn(gameId);

        this.emitGameLogToRoom(gameId, `Debut du combat entre ${attackerName} et ${defenderName}.`);

        this.gameplayService.turnService.startCombatTimer(TEMPS_COMBAT, activeGame, async () => {
            const combatResolved = await this.gameplayService.actionService.applyCombatTurn(gameId);
            if (combatResolved) {
                await this.handleTurnAndGameEndCase(attackerName, gameId, namespace);
            }
        });

        namespace?.to(gameId).emit(SocketEvent.CombatStarted, result);
        namespace?.to(gameId).emit(SocketEvent.CombatTurnStart, result);
    }

    private async handleCtfFlagAction(activeGame: IActiveGame, data: IActionData, namespace: Namespace): Promise<boolean> {
        const { gameId, currentPlayerName, targetName } = data;

        if (activeGame.game.gameMode !== 'ctf') {
            return false;
        }

        const areOnSameTeam = await this.gameplayService.actionService.isOnSameTeam(currentPlayerName, targetName, gameId);
        if (!areOnSameTeam) {
            return false;
        }

        const canGiveFlag = await this.gameplayService.actionService.canGiveFlag(currentPlayerName, gameId);
        if (canGiveFlag) {
            const flagActionData = await this.gameplayService.actionService.flagActionRequest(currentPlayerName, targetName, gameId);
            this.pendingFlagRequestsByGameId.set(gameId, { requesterName: currentPlayerName, targetPlayerName: targetName });
            namespace?.to(gameId).emit(SocketEvent.GiveFlag, flagActionData);
            return true;
        }

        const canTakeFlag = await this.gameplayService.actionService.canTakeFlag(targetName, gameId);
        if (canTakeFlag) {
            const flagActionData = await this.gameplayService.actionService.flagActionRequest(currentPlayerName, targetName, gameId);
            this.pendingFlagRequestsByGameId.set(gameId, { requesterName: currentPlayerName, targetPlayerName: targetName });
            namespace?.to(gameId).emit(SocketEvent.TakeFlag, flagActionData);
            return true;
        }

        return true;
    }

    async handleAttack(
        data: IActionData,
        socket: Socket,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        const { gameId, currentPlayerName, targetName } = data;
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) {
            socket.emit(SocketEvent.ActionError, { errorCodes: [ErrorCode.ActiveGameNotFound] });
            return;
        }

        const allowed = await this.gameplayService.actionService.canUseAction(gameId, currentPlayerName, targetName);
        if (!allowed) {
            socket.emit(SocketEvent.ActionError, { errorCodes: [ErrorCode.ActionNotAllowed] });
            return;
        }

        const result = await this.activeGameService.startCombat(gameId, currentPlayerName, targetName);
        this.gameplayService.turnService.suspendTurn(gameId);

        emitGameLog(gameId, `Debut du combat entre ${currentPlayerName} et ${targetName}.`);

        this.gameplayService.turnService.startCombatTimer(TEMPS_COMBAT, activeGame, async () => {
            const combatResolved = await this.gameplayService.actionService.applyCombatTurn(gameId);
            if (combatResolved) {
                await this.handleTurnAndGameEndCase(currentPlayerName, gameId, namespace);
            }
        });

        namespace.to(gameId).emit(SocketEvent.CombatStarted, result);
        namespace.to(gameId).emit(SocketEvent.CombatTurnStart, result);
    }

    async handleAction(data: IActionData, socket: Socket, namespace: Namespace): Promise<void> {
        const { gameId, currentPlayerName, targetName } = data;
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const allowed = await this.gameplayService.actionService.canUseAction(gameId, currentPlayerName, targetName);

        if (!allowed) {
            socket.emit(SocketEvent.ActionError, { errorCodes: [ErrorCode.ActionNotAllowed] });
            return;
        }

        const handledAsFlagAction = await this.handleCtfFlagAction(activeGame, data, namespace);
        if (handledAsFlagAction) {
            return;
        }
        await this.combatManager(gameId, currentPlayerName, targetName, namespace);
    }

    async handleFlagTaken(data: IFlagDecisionData, namespace: Namespace): Promise<void> {
        const { gameId, newFlagCarrierName } = data;
        const pendingRequest = this.pendingFlagRequestsByGameId.get(gameId);
        if (!pendingRequest) {
            return;
        }

        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const currentTurnPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
        const isRequesterTurn = currentTurnPlayerName === pendingRequest.requesterName;
        const isExpectedNewCarrier = newFlagCarrierName === pendingRequest.requesterName;

        if (!isRequesterTurn || !isExpectedNewCarrier) {
            this.pendingFlagRequestsByGameId.delete(gameId);
            return;
        }

        await this.gameplayService.actionService.takeFlag(gameId, newFlagCarrierName);
        namespace.to(gameId).emit(SocketEvent.FlagPickedUp, { playerName: newFlagCarrierName });
        this.pendingFlagRequestsByGameId.delete(gameId);
    }

    async handleFlagGiven(data: IFlagDecisionData, namespace: Namespace): Promise<void> {
        const { gameId, newFlagCarrierName } = data;
        const pendingRequest = this.pendingFlagRequestsByGameId.get(gameId);
        if (!pendingRequest) {
            return;
        }
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const currentTurnPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
        const isRequesterTurn = currentTurnPlayerName === pendingRequest.requesterName;
        const isExpectedNewCarrier = newFlagCarrierName === pendingRequest.targetPlayerName;

        if (!isRequesterTurn || !isExpectedNewCarrier) {
            this.pendingFlagRequestsByGameId.delete(gameId);
            return;
        }

        await this.gameplayService.actionService.giveFlag(gameId, newFlagCarrierName);
        namespace.to(gameId).emit(SocketEvent.FlagPickedUp, { playerName: newFlagCarrierName });
        this.pendingFlagRequestsByGameId.delete(gameId);
    }

    async handleChooseAttackPosture(data: IAttackPostureData, namespace: Namespace): Promise<void> {
        const { gameId, playerName, posture } = data;
        const updatedActiveGame = await this.activeGameService.choosePosture(gameId, playerName, posture);

        const combatReady = updatedActiveGame.currentAttack?.attackerPosture && updatedActiveGame.currentAttack?.defenderPosture;
        if (!combatReady) {
            namespace.to(gameId).emit(SocketEvent.AttackPostureChosen, data);
            return;
        }

        this.gameplayService.turnService.clearCombatTimer(updatedActiveGame);

        const combatResolved = await this.gameplayService.actionService.applyCombatTurn(gameId);

        const currentPlayerName = updatedActiveGame.turnOrder[updatedActiveGame.currentPlayerIndex];
        if (combatResolved && currentPlayerName) {
            await this.handleTurnAndGameEndCase(currentPlayerName, gameId, namespace);
        }
    }

    async handleStartGame(activeGameId: string, socket: Socket, namespace: Namespace): Promise<boolean> {
        if (!activeGameId) {
            return false;
        }

        const activeGame = await this.activeGameService.getActiveGameById(activeGameId);

        if (!socket.rooms.has(activeGameId)) {
            return false;
        }
        if (activeGame.game.gameMode === 'ctf' && activeGame.players.length % 2 !== 0) {
            socket.emit(SocketEvent.StartGameError, { errorCodes: [ErrorCode.CtfRequiresEvenPlayerCount] });
            return false;
        }
        if (activeGame.players.length < 2) {
            socket.emit(SocketEvent.StartGameError, { errorCodes: [ErrorCode.StartGameRequiresAtLeastTwoPlayers] });
            return false;
        }

        await this.gameplayService.startGameService.initializeGame(activeGameId);

        const updatedGame = await this.activeGameService.getActiveGameById(activeGameId);
        namespace.to(activeGameId).emit(SocketEvent.PlayersUpdated, updatedGame.players);
        namespace.to(activeGameId).emit(SocketEvent.GameStarted, activeGameId);

        this.gameplayService.turnService.startTurn(activeGameId);
        return true;
    }

    emitGameLogToRoom(gameId: string, message: string, namespace?: Namespace): void {
        if (!namespace || !gameId || !message.trim()) {
            return;
        }

        namespace.to(gameId).emit(SocketEvent.GameLog, this.createGameLogPayload(message));
    }

    private createGameLogPayload(message: string): IGameLogPayload {
        return {
            message,
            postedAt: new Date().toISOString(),
        };
    }

    private async checkEndTurnIfNoMovesLeft(gameId: string, playerId: string): Promise<void> {
        const reachable = await this.gameplayService.movementService.getReachablePositions(playerId, gameId);
        const canAttackAnyPlayer = await this.gameplayService.actionService.canUseActionAnyPlayer(gameId, playerId);
        if (reachable.length === 0 && !canAttackAnyPlayer) {
            await this.gameplayService.turnService.endTurn(gameId);
        }
    }

    private async handleTurnAndGameEndCase(attackerName: string, gameId: string, namespace: Namespace): Promise<void> {
        const reachable = await this.gameplayService.movementService.getReachablePositions(attackerName, gameId);
        if (reachable.length === 0) {
            await this.gameplayService.turnService.endTurn(gameId);
        }

        const gameEnded = await this.gameplayService.endGameService.checkEndGame(gameId);
        if (gameEnded) {
            namespace.to(gameId).emit(SocketEvent.GameEnded, { winner: attackerName });

            //await this.activeGameService.deleteGameById(gameId);
        }
    }

    private toSocketError(error: unknown, fallbackCode: ErrorCode): { errorCodes: ErrorCode[] } {
        if (error instanceof AppError) {
            return { errorCodes: error.errorCodes };
        }

        return { errorCodes: [fallbackCode] };
    }
}
