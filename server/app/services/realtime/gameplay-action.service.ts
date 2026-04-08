import { AppError } from '@app/error-types/app-error';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { ActionService } from '@app/services/gameplay/action-service';
import { DoorService } from '@app/services/gameplay/door-service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { MovementService } from '@app/services/gameplay/movement-service';
import { SanctuaryService } from '@app/services/gameplay/sanctuary-service';
import { StartGameService } from '@app/services/gameplay/start-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { sanctuaryCoversCell } from '@app/utils/sanctuary';
import { IActiveGame } from '@common/activeGame';
import { AttackPosture } from '@common/attackResult';
import { CellType } from '@common/board';
import { ICharacter, VirtualPlayerProfile } from '@common/character';
import { TEMPS_COMBAT } from '@common/constants';
import { ErrorCode } from '@common/error-codes';
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
import { CtfFlagActionService, PendingFlagRequest } from './ctf-flag-action.service';
import { GameSessionService } from './game-session.service';

@Service()
export class GameplayActionService {
    /* eslint-disable max-params */
    private pendingFlagRequestsByGameId: Map<string, PendingFlagRequest> = new Map();
    constructor(
        private readonly turnService: TurnService,
        private readonly startGameService: StartGameService,
        private readonly movementService: MovementService,
        private readonly doorService: DoorService,
        private readonly sanctuaryService: SanctuaryService,
        private readonly endGameService: EndGameService,
        private readonly gameSessionService: GameSessionService,
        private readonly activeGameService: ActiveGameService,
        private readonly actionService: ActionService,
        private readonly ctfFlagActionService: CtfFlagActionService,
    ) {}
    async handleEndTurn(gameId: string): Promise<void> {
        this.pendingFlagRequestsByGameId.delete(gameId);
        await this.turnService.endTurn(gameId);
        this.pendingFlagRequestsByGameId.delete(gameId);
    }

    async handlePlayerAbandon(data: IAbandonData, namespace: Namespace, socket: Socket): Promise<void> {
        await this.gameSessionService.handlePlayerAbandon(data, namespace, socket, this.emitGameLogToRoom.bind(this));
        const gameId = data.gameId;
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) {
            return;
        }
        const gameEnded = await this.endGameService.checkEndGame(gameId);
        if (gameEnded) {
            this.pendingFlagRequestsByGameId.delete(gameId);
        }
    }

    async handlePlayerMove(data: IPlayerMoveData, socket: Socket, namespace: Namespace): Promise<void> {
        const { gameId, playerId, direction } = data;
        try {
            const { newPosition, movementLeft } = await this.movementService.movePlayer(playerId, gameId, direction);
            namespace.to(gameId).emit(SocketEvent.PlayerMoved, { playerId, newPosition, movementLeft } as PlayerMovedResult);

            const reachable = await this.movementService.getReachablePositions(playerId, gameId);
            const canAttackAnyPlayer = await this.actionService.canUseActionAnyPlayer(gameId, playerId);
            if (reachable.length === 0 && !canAttackAnyPlayer) {
                await this.turnService.endTurn(gameId);
            }
            const gameEnded = await this.endGameService.checkEndGame(gameId);
            if (gameEnded) {
                const endedGame = await this.activeGameService.getActiveGameById(gameId);
                namespace.to(gameId).emit(SocketEvent.GameEnded, { winner: endedGame.winner });
                //await this.activeGameService.deleteGameById(gameId);
            }
        } catch (error) {
            socket.emit(SocketEvent.PlayerMoveError, this.toSocketError(error, ErrorCode.PositionNotWalkable));
        }
    }

    async handleToggleDoor(
        data: IDoorToggleData,
        socket: Socket | null,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        const { gameId, playerId, position } = data;
        try {
            const result: IDoorToggledResult = await this.doorService.toggleDoor(playerId, gameId, position);
            await this.trackManipulatedDoor(gameId, result.position.x, result.position.y);
            namespace.to(gameId).emit(SocketEvent.DoorToggled, result);
            emitGameLog(gameId, `${playerId} a ${result.cellType === CellType.OpenDoor ? 'ouvert' : 'fermé'} une porte.`);

            await this.checkEndTurnIfNoMovesLeft(gameId, playerId);
        } catch (error) {
            socket?.emit(SocketEvent.DoorToggleError, this.toSocketError(error, ErrorCode.InvalidDoorTarget));
        }
    }

    async handleSanctuaryInteraction(
        data: ISanctuaryInteractionData,
        socket: Socket | null,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        const { gameId, playerId, position, choice } = data;
        try {
            const result: ISanctuaryInteractedResult = await this.sanctuaryService.interactSanctuary(playerId, gameId, {
                position,
                choice,
            });
            await this.trackUsedSanctuary(gameId, position.x, position.y);
            namespace.to(gameId).emit(SocketEvent.SanctuaryInteracted, result);
            const sanctuaryKind = result.itemType === ItemType.LifeSanctuary ? 'vie' : 'combat';
            emitGameLog(gameId, `${playerId} a utilisé un sanctuaire de ${sanctuaryKind}.`);

            await this.checkEndTurnIfNoMovesLeft(gameId, playerId);
        } catch (error) {
            socket?.emit(SocketEvent.SanctuaryInteractionError, this.toSocketError(error, ErrorCode.InvalidSanctuaryTarget));
        }
    }

    async combatManager(gameId: string, attackerName: string, defenderName: string, namespace: Namespace): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const result = await this.activeGameService.startCombat(gameId, attackerName, defenderName);
        this.turnService.suspendTurn(gameId);

        this.emitGameLogToRoom(gameId, `Debut du combat entre ${attackerName} et ${defenderName}.`);

        this.turnService.startCombatTimer(TEMPS_COMBAT, activeGame, async () => {
            const combatResolved = await this.actionService.applyCombatTurn(gameId);
            if (combatResolved) {
                await this.handlePostCombatEndScenario(attackerName, gameId, namespace);
            }
        });

        namespace?.to(gameId).emit(SocketEvent.CombatStarted, result);
        namespace?.to(gameId).emit(SocketEvent.CombatTurnStart, result);
        await this.autoChooseVirtualPostures(gameId, namespace);
    }

    async handleAction(data: IActionData, socket: Socket, namespace: Namespace): Promise<void> {
        const { gameId, currentPlayerName, targetName } = data;
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const allowed = await this.actionService.canUseAction(gameId, currentPlayerName, targetName);

        if (!allowed) {
            socket.emit(SocketEvent.ActionError, { errorCodes: [ErrorCode.ActionNotAllowed] });
            return;
        }

        const handledAsFlagAction = await this.ctfFlagActionService.handleFlagAction(activeGame, data, namespace, (targetGameId, request) => {
            this.pendingFlagRequestsByGameId.set(targetGameId, request);
        });
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

        await this.actionService.takeFlag(gameId, newFlagCarrierName);
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

        await this.actionService.giveFlag(gameId, newFlagCarrierName);
        namespace.to(gameId).emit(SocketEvent.FlagPickedUp, { playerName: newFlagCarrierName });
        this.pendingFlagRequestsByGameId.delete(gameId);
    }

    async handleChooseAttackPosture(data: IAttackPostureData, namespace: Namespace): Promise<void> {
        const { gameId, playerName, posture } = data;
        let updatedActiveGame: IActiveGame;
        try {
            updatedActiveGame = await this.activeGameService.choosePosture(gameId, playerName, posture);
        } catch (error) {
            if (this.isNoOngoingAttackError(error)) {
                return;
            }
            throw error;
        }

        const combatReady = updatedActiveGame.currentAttack?.attackerPosture && updatedActiveGame.currentAttack?.defenderPosture;
        if (!combatReady) {
            namespace.to(gameId).emit(SocketEvent.AttackPostureChosen, data);
            return;
        }

        this.turnService.clearCombatTimer(updatedActiveGame);

        let combatResolved: boolean;
        try {
            combatResolved = await this.actionService.applyCombatTurn(gameId);
        } catch (error) {
            if (this.isNoOngoingAttackError(error)) {
                return;
            }
            throw error;
        }

        const currentPlayerName = updatedActiveGame.turnOrder[updatedActiveGame.currentPlayerIndex];
        if (combatResolved && currentPlayerName) {
            await this.handlePostCombatEndScenario(currentPlayerName, gameId, namespace);
            return;
        }

        await this.autoChooseVirtualPostures(gameId, namespace);
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

        await this.startGameService.initializeGame(activeGameId);

        const updatedGame = await this.activeGameService.getActiveGameById(activeGameId);
        namespace.to(activeGameId).emit(SocketEvent.PlayersUpdated, updatedGame.players);
        namespace.to(activeGameId).emit(SocketEvent.GameStarted, activeGameId);

        this.turnService.startTurn(activeGameId);
        return true;
    }

    emitGameLogToRoom(gameId: string, message: string, namespace?: Namespace): void {
        if (!namespace || !gameId || !message.trim()) {
            return;
        }
        namespace.to(gameId).emit(SocketEvent.GameLog, this.createGameLogPayload(message));
    }

    private createGameLogPayload(message: string): IGameLogPayload {
        return { message, postedAt: new Date().toISOString() };
    }

    async checkEndTurnIfNoMovesLeft(gameId: string, playerId: string): Promise<void> {
        const reachable = await this.movementService.getReachablePositions(playerId, gameId);
        const canAttackAnyPlayer = await this.actionService.canUseActionAnyPlayer(gameId, playerId);
        if (reachable.length === 0 && !canAttackAnyPlayer) {
            await this.turnService.endTurn(gameId);
        }
    }

    private async autoChooseVirtualPostures(gameId: string, namespace: Namespace): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const currentAttack = activeGame?.currentAttack;
        if (!activeGame || !currentAttack) return;
        const attacker = activeGame.players.find((player) => player.name === currentAttack.attacker);
        if (attacker && !currentAttack.attackerPosture && attacker.virtualPlayerProfile) {
            await this.handleChooseAttackPosture(
                {
                    gameId,
                    playerName: attacker.name,
                    posture: this.getVirtualPosture(attacker),
                },
                namespace,
            );
        }
        const refreshedGame = await this.activeGameService.getActiveGameById(gameId);
        const refreshedAttack = refreshedGame?.currentAttack;
        if (!refreshedGame || !refreshedAttack) return;
        const refreshedDefender = refreshedGame.players.find((player) => player.name === refreshedAttack.defender);
        if (refreshedDefender && !refreshedAttack.defenderPosture && refreshedDefender.virtualPlayerProfile) {
            await this.handleChooseAttackPosture(
                {
                    gameId,
                    playerName: refreshedDefender.name,
                    posture: this.getVirtualPosture(refreshedDefender),
                },
                namespace,
            );
        }
    }

    private async trackManipulatedDoor(gameId: string, x: number, y: number): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) {
            return;
        }

        const doorKey = `${x},${y}`;
        if (!activeGame.manipulatedDoors.includes(doorKey)) {
            activeGame.manipulatedDoors.push(doorKey);
            await this.activeGameService.saveActiveGameById(gameId, activeGame);
        }
    }

    private async trackUsedSanctuary(gameId: string, x: number, y: number): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) {
            return;
        }

        const sanctuaryItem = activeGame.game.board.items.find((item) => sanctuaryCoversCell(item, y, x));
        if (!sanctuaryItem || (sanctuaryItem.itemType !== ItemType.LifeSanctuary && sanctuaryItem.itemType !== ItemType.FightSanctuary)) {
            return;
        }

        const sanctuaryKey = `${sanctuaryItem.itemType}:${sanctuaryItem.x},${sanctuaryItem.y}`;
        if (!activeGame.usedSanctuaries.includes(sanctuaryKey)) {
            activeGame.usedSanctuaries.push(sanctuaryKey);
            await this.activeGameService.saveActiveGameById(gameId, activeGame);
        }
    }
    private getVirtualPosture(player: ICharacter): AttackPosture {
        return player.virtualPlayerProfile === VirtualPlayerProfile.Defensive ? AttackPosture.Defensive : AttackPosture.Offensive;
    }

    private async handlePostCombatEndScenario(attackerName: string, gameId: string, namespace: Namespace): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) {
            return;
        }

        const gameEnded = await this.endGameService.checkEndGame(gameId);
        if (gameEnded) {
            namespace.to(gameId).emit(SocketEvent.GameEnded, { winner: attackerName });
            console.log(`Game ended. Winner: ${attackerName}`);
            //await this.activeGameService.deleteGameById(gameId);
        }

        const attackerIsVirtual = activeGame.players.find((player) => player.name === attackerName)?.virtualPlayerProfile;
        if (attackerIsVirtual) {
            await this.turnService.endTurn(gameId);
            return;
        }

        await this.checkEndTurnIfNoMovesLeft(gameId, attackerName);
    }

    private toSocketError(error: unknown, fallbackCode: ErrorCode): { errorCodes: ErrorCode[] } {
        if (error instanceof AppError) return { errorCodes: error.errorCodes };
        return { errorCodes: [fallbackCode] };
    }

    private isNoOngoingAttackError(error: unknown): boolean {
        return error instanceof AppError && error.errorCodes.includes(ErrorCode.NoOngoingAttack);
    }
}
