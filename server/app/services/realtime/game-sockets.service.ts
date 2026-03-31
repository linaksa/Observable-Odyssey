/* eslint-disable max-lines */
import { ActiveGameListSocketsService } from '@app/services/active-game/active-game-list-sockets.service';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { GameplayServices } from '@app/services/gameplay/gameplay-dependencies.service';
import { ChatService } from '@app/services/realtime/chat.service';
import { DebugSocketService } from '@app/services/realtime/debug-socket.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/activeGame';
import { TEMPS_COMBAT } from '@common/constants';
import { Namespaces } from '@common/namespaces';
import { PlayerMovedResult } from '@common/playerMovedResult';
import { SocketEvent } from '@common/socket-events';
import {
    IAbandonData,
    IActionData,
    IAttackPostureData,
    IDebugToggleState,
    IFlagDecisionData,
    IGameLogPayload,
    IJoinGamePayload,
    IPlayerMoveData,
    ISocketData,
} from '@common/socket-payloads';
import { Namespace, Socket } from 'socket.io';
import { Service } from 'typedi';

interface PendingFlagRequest {
    requesterName: string;
    targetPlayerName: string;
}

@Service()
export class GameSocketsService {
    private namespace?: Namespace;
    private pendingFlagRequestsByGameId: Map<string, PendingFlagRequest> = new Map();

    // In our context, GameSocketService centralize the treatment of socket operations
    // It is a good practice to delegate the treatment of each events to services
    /* eslint-disable max-params */
    constructor(
        private readonly gameplayService: GameplayServices,
        private readonly socketService: SocketService,
        private readonly debugSocketService: DebugSocketService,
        private readonly activeGameService: ActiveGameService,
        private readonly chatService: ChatService,
        private readonly activeGameListSocketService: ActiveGameListSocketsService,
    ) {}

    initialize(): void {
        this.namespace = this.socketService.createNamespace(Namespaces.Game);

        this.namespace.on('connection', (socket: Socket) => {
            this.chatService.register(socket);
            this.debugSocketService.register(socket);

            socket.on(SocketEvent.JoinGame, async (payload: string | IJoinGamePayload) => {
                const { activeGameId, playerName } = this.parseJoinGamePayload(payload);
                if (!activeGameId) {
                    return;
                }

                this.leaveOtherGameRooms(socket, activeGameId);
                socket.join(activeGameId);
                if (playerName) {
                    this.setSocketPlayerName(socket, activeGameId, playerName);
                }

                try {
                    const activeGame = await this.activeGameService.getActiveGameById(activeGameId);
                    if (activeGame?.players) {
                        this.namespace?.to(activeGameId).emit(SocketEvent.PlayersUpdated, activeGame.players);
                    }
                } catch {
                    return;
                }
            });
            socket.on(SocketEvent.PlayerKick, async (data: IAbandonData) => {
                const { gameId, playerId } = data;
                await this.activeGameService.removePlayer(gameId, playerId);
                this.namespace?.to(gameId).emit(SocketEvent.PlayerKicked, { playerId });
                this.activeGameListSocketService.emitJoinableGamesUpdated(gameId);
            });

            socket.on(SocketEvent.LeaveWaitingRoom, async (data: IAbandonData) => {
                const { gameId, playerId } = data;
                const isOrganizer = await this.gameplayService.endGameService.checkIfOrganizer(gameId, playerId);
                if (isOrganizer) {
                    socket.to(gameId).emit(SocketEvent.GameCanceled);
                    await this.activeGameService.deleteGameById(gameId);
                } else {
                    await this.activeGameService.removePlayer(gameId, playerId);
                    this.namespace?.to(gameId).emit(SocketEvent.LeftWaitingRoom, { playerId });
                }
                this.activeGameListSocketService.emitJoinableGamesUpdated(gameId);
                this.unregisterSocketFromGame(socket, gameId);
            });

            socket.on(SocketEvent.StartGame, async (activeGameId: string) => {
                const activeGame = await this.activeGameService.getActiveGameById(activeGameId);
                if (!activeGameId) {
                    return;
                }

                if (!socket.rooms.has(activeGameId)) {
                    return;
                }
                if (activeGame.game.gameMode === 'ctf' && activeGame.players.length % 2 !== 0) {
                    socket.emit(SocketEvent.StartGameError, {
                        message: 'Le mode CTF nécessite un nombre pair de joueurs.',
                    });
                    return;
                }
                if (activeGame.players.length < 2) {
                    socket.emit(SocketEvent.StartGameError, {
                        message: 'Il faut au moins 2 joueurs pour démarrer la partie.',
                    });
                    return;
                }

                // Initialize the game
                await this.gameplayService.startGameService.initializeGame(activeGameId);

                // Notify all players with updated positions
                const updatedGame = await this.activeGameService.getActiveGameById(activeGameId);
                this.namespace?.to(activeGameId).emit(SocketEvent.PlayersUpdated, updatedGame.players);

                // Notify all players
                this.namespace?.to(activeGameId).emit(SocketEvent.GameStarted, activeGameId);
                this.activeGameListSocketService.emitJoinableGamesUpdated(activeGameId);

                // Start the first player's turn
                this.gameplayService.turnService.startTurn(activeGameId);
            });
            // =======================
            // Player movement
            // =======================
            socket.on(SocketEvent.PlayerMove, async (data: IPlayerMoveData) => {
                const { gameId, playerId, direction } = data;
                try {
                    const { newPosition, movementLeft } = await this.gameplayService.movementService.movePlayer(playerId, gameId, direction);
                    this.namespace?.to(gameId).emit(SocketEvent.PlayerMoved, { playerId, newPosition, movementLeft } as PlayerMovedResult);

                    const reachable = await this.gameplayService.movementService.getReachablePositions(playerId, gameId);
                    const canAttackAnyPlayer = await this.gameplayService.actionService.canUseActionAnyPlayer(gameId, playerId);
                    if (reachable.length === 0 && !canAttackAnyPlayer) {
                        await this.gameplayService.turnService.endTurn(gameId);
                    }
                    const gameEnded = await this.gameplayService.endGameService.checkEndGame(gameId);
                    if (gameEnded) {
                        const endedGame = await this.activeGameService.getActiveGameById(gameId);
                        this.namespace?.to(gameId).emit(SocketEvent.GameEnded, { winner: endedGame.winner });
                        await this.activeGameService.deleteGameById(gameId);
                    }
                } catch (error) {
                    socket.emit(SocketEvent.PlayerMoveError, { message: (error as Error).message ?? 'Déplacement non autorisé' });
                }
            });
            // =======================
            // Action
            // =======================
            socket.on(SocketEvent.Action, async (data: IActionData) => {
                await this.handleAction(socket, data);
            });
            // FlagGiven
            socket.on(SocketEvent.FlagGiven, async (data: IFlagDecisionData) => {
                const { gameId, newFlagCarrierName } = data;
                const pendingRequest = this.pendingFlagRequestsByGameId.get(gameId);
                if (!pendingRequest) {
                    return;
                }

                const activeGame = await this.activeGameService.getActiveGameById(gameId);
                const currentTurnPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
                const socketPlayerName = (socket.data as ISocketData).playerNamesByGameId?.[gameId];
                const isRequesterTurn = currentTurnPlayerName === pendingRequest.requesterName;
                const isTargetResponder = socketPlayerName === pendingRequest.targetPlayerName;

                if (!isRequesterTurn || !isTargetResponder) {
                    this.pendingFlagRequestsByGameId.delete(gameId);
                    return;
                }

                await this.gameplayService.actionService.giveFlag(gameId, newFlagCarrierName);
                this.namespace?.to(gameId).emit(SocketEvent.FlagPickedUp, { playerName: newFlagCarrierName });
                this.pendingFlagRequestsByGameId.delete(gameId);
            });
            // FlagTaken
            socket.on(SocketEvent.FlagTaken, async (data: IFlagDecisionData) => {
                const { gameId, newFlagCarrierName } = data;
                const pendingRequest = this.pendingFlagRequestsByGameId.get(gameId);
                if (!pendingRequest) {
                    return;
                }
                const activeGame = await this.activeGameService.getActiveGameById(gameId);
                const currentTurnPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
                const socketPlayerName = (socket.data as ISocketData).playerNamesByGameId?.[gameId];
                const isRequesterTurn = currentTurnPlayerName === pendingRequest.requesterName;
                const isTargetResponder = socketPlayerName === pendingRequest.targetPlayerName;

                if (!isRequesterTurn || !isTargetResponder) {
                    this.pendingFlagRequestsByGameId.delete(gameId);
                    return;
                }

                await this.gameplayService.actionService.takeFlag(gameId, newFlagCarrierName);
                this.namespace?.to(gameId).emit(SocketEvent.FlagPickedUp, { playerName: newFlagCarrierName });
                this.pendingFlagRequestsByGameId.delete(gameId);
            });

            socket.on(SocketEvent.ChooseAttackPosture, async (data: IAttackPostureData) => {
                const { gameId, playerName, posture } = data;
                const updatedActiveGame = await this.activeGameService.choosePosture(gameId, playerName, posture);

                const combatReady = updatedActiveGame.currentAttack?.attackerPosture && updatedActiveGame.currentAttack?.defenderPosture;
                if (!combatReady) {
                    this.namespace?.to(gameId).emit(SocketEvent.AttackPostureChosen, data);
                    return;
                }

                // The combat turn is applied immediately
                this.gameplayService.turnService.clearCombatTimer(updatedActiveGame);

                const combatResolved = await this.gameplayService.actionService.applyCombatTurn(gameId);

                const currentPlayerName = updatedActiveGame.turnOrder[updatedActiveGame.currentPlayerIndex];
                if (combatResolved && currentPlayerName) {
                    await this.handleTurnAndGameEndCase(currentPlayerName, gameId);
                }
            });

            // =======================
            // End turn
            // =======================
            socket.on(SocketEvent.EndTurn, (gameId: string) => {
                this.pendingFlagRequestsByGameId.delete(gameId);
                this.gameplayService.turnService.endTurn(gameId);
            });
            // =======================
            // Player abandon
            // =======================
            socket.on(SocketEvent.PlayerAbandon, async (data: IAbandonData) => {
                const { gameId, playerId } = data;
                await this.gameplayService.endGameService.handlePlayerAbandon(playerId, gameId);
                this.emitGameLogToRoom(gameId, `Abandon de partie: ${playerId}.`);

                const updatedGame = await this.activeGameService.getActiveGameById(gameId);
                await this.disableDebugModeIfOrganizerLeft(gameId, playerId, updatedGame);

                // notify other players about the quitting player
                this.namespace?.to(gameId).emit(SocketEvent.PlayerAbandoned, { playerId });
                const gameEnded = await this.gameplayService.endGameService.checkEndGame(gameId);
                if (gameEnded) {
                    const endedGame = await this.activeGameService.getActiveGameById(gameId);
                    this.namespace?.to(gameId).emit(SocketEvent.GameEnded, { winner: endedGame.winner });
                    this.emitGameLogToRoom(gameId, 'Fin de partie: il ne reste pas assez de joueurs.');
                    await this.activeGameService.deleteGameById(gameId);
                    this.pendingFlagRequestsByGameId.delete(gameId);
                }

                // Abandoning a game should also remove the socket from that game's room
                // to avoid receiving room-scoped events from old games.
                this.unregisterSocketFromGame(socket, gameId);
            });

            socket.on('disconnect', async () => {
                const data = socket.data as ISocketData;
                const playerNamesByGameId = data.playerNamesByGameId;
                if (!playerNamesByGameId) return;

                for (const [gameId, playerId] of Object.entries(playerNamesByGameId)) {
                    const updatedGame = await this.activeGameService.getActiveGameById(gameId);
                    if (!updatedGame) continue;

                    const gameHasStarted = updatedGame.turnOrder.length > 0;
                    if (!gameHasStarted) {
                        await this.handleWaitingRoomDisconnect(gameId, playerId);
                    } else {
                        await this.handleActiveGameDisconnect(gameId, playerId);
                    }
                }
            });
        });
    }

    private async handleWaitingRoomDisconnect(gameId: string, playerId: string): Promise<void> {
        const isOrganizer = await this.gameplayService.endGameService.checkIfOrganizer(gameId, playerId);
        if (isOrganizer) {
            this.namespace?.to(gameId).emit(SocketEvent.GameCanceled, { playerId });
            await this.activeGameService.deleteGameById(gameId);
        } else {
            await this.activeGameService.removePlayer(gameId, playerId);
            this.namespace?.to(gameId).emit(SocketEvent.LeftWaitingRoom, { playerId });
        }
        this.activeGameListSocketService.emitJoinableGamesUpdated(gameId);
    }

    private async handleActiveGameDisconnect(gameId: string, playerId: string): Promise<void> {
        await this.gameplayService.endGameService.handlePlayerAbandon(playerId, gameId);
        this.emitGameLogToRoom(gameId, `Abandon de partie: ${playerId}.`);

        const refreshedGame = await this.activeGameService.getActiveGameById(gameId);
        this.namespace?.to(gameId).emit(SocketEvent.PlayersUpdated, refreshedGame.players);
        this.namespace?.to(gameId).emit(SocketEvent.PlayerAbandoned, { playerId });

        await this.disableDebugModeIfOrganizerLeft(gameId, playerId, refreshedGame);

        const isCurrentPlayer = refreshedGame.turnOrder[refreshedGame.currentPlayerIndex] === playerId;
        const gameEnded = await this.gameplayService.endGameService.checkEndGame(gameId);
        if (gameEnded) {
            const endedGame = await this.activeGameService.getActiveGameById(gameId);
            this.namespace?.to(gameId).emit(SocketEvent.GameEnded, { winner: endedGame.winner });
            this.emitGameLogToRoom(gameId, 'Fin de partie: il ne reste pas assez de joueurs.');
            await this.activeGameService.deleteGameById(gameId);
            this.pendingFlagRequestsByGameId.delete(gameId);
        }
        if (isCurrentPlayer) {
            await this.gameplayService.turnService.endTurn(gameId);
        }
    }

    private parseJoinGamePayload(payload: string | IJoinGamePayload): IJoinGamePayload {
        if (typeof payload === 'string') {
            return { activeGameId: payload };
        }
        return {
            activeGameId: payload?.activeGameId ?? '',
            playerName: payload?.playerName,
        };
    }

    private setSocketPlayerName(socket: Socket, gameId: string, playerName: string): void {
        const data = socket.data as ISocketData;
        if (!data.playerNamesByGameId) {
            data.playerNamesByGameId = {};
        }
        data.playerNamesByGameId[gameId] = playerName;
    }

    private unregisterSocketFromGame(socket: Socket, gameId: string): void {
        socket.leave(gameId);
        this.clearSocketPlayerName(socket, gameId);
    }

    private leaveOtherGameRooms(socket: Socket, targetGameId: string): void {
        for (const roomId of socket.rooms) {
            if (roomId === socket.id || roomId === targetGameId) {
                continue;
            }
            this.unregisterSocketFromGame(socket, roomId);
        }
    }

    private clearSocketPlayerName(socket: Socket, gameId: string): void {
        const data = socket.data as ISocketData;
        if (!data.playerNamesByGameId) {
            return;
        }

        delete data.playerNamesByGameId[gameId];
        if (Object.keys(data.playerNamesByGameId).length === 0) {
            delete data.playerNamesByGameId;
        }
    }

    private emitGameLogToRoom(gameId: string, message: string): void {
        if (!this.namespace || !gameId || !message.trim()) {
            return;
        }

        this.namespace.to(gameId).emit(SocketEvent.GameLog, this.createGameLogPayload(message));
    }

    private createGameLogPayload(message: string): IGameLogPayload {
        return {
            message,
            postedAt: new Date().toISOString(),
        };
    }

    private async disableDebugModeIfOrganizerLeft(gameId: string, playerId: string, activeGame: IActiveGame): Promise<void> {
        const gameHasStarted = activeGame.turnOrder.length > 0;
        if (playerId !== activeGame.organizerName || !gameHasStarted || !activeGame.isDebugMode) {
            return;
        }

        activeGame.isDebugMode = false;
        await this.activeGameService.saveActiveGameById(gameId, activeGame);
        const payload: IDebugToggleState = { playerName: playerId, isDebugMode: false };
        this.namespace?.to(gameId).emit(SocketEvent.DebugToggle, payload);
        this.emitGameLogToRoom(gameId, `Mode debug desactive (organisateur ${playerId} absent).`);
    }

    private async handleTurnAndGameEndCase(attackerName: string, gameId: string): Promise<void> {
        const reachable = await this.gameplayService.movementService.getReachablePositions(attackerName, gameId);
        if (reachable.length === 0) {
            await this.gameplayService.turnService.endTurn(gameId);
        }

        const gameEnded = await this.gameplayService.endGameService.checkEndGame(gameId);
        if (gameEnded) {
            this.namespace?.to(gameId).emit(SocketEvent.GameEnded, { winner: attackerName });
            await this.activeGameService.deleteGameById(gameId);
        }
    }

    private async combatManager(gameId: string, attackerName: string, defenderName: string): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const result = await this.activeGameService.startCombat(gameId, attackerName, defenderName);
        this.gameplayService.turnService.suspendTurn(gameId);

        this.emitGameLogToRoom(gameId, `Debut du combat entre ${attackerName} et ${defenderName}.`);

        this.gameplayService.turnService.startCombatTimer(TEMPS_COMBAT, activeGame, async () => {
            const combatResolved = await this.gameplayService.actionService.applyCombatTurn(gameId);
            if (combatResolved) {
                await this.handleTurnAndGameEndCase(attackerName, gameId);
            }
        });

        this.namespace?.to(gameId).emit(SocketEvent.CombatStarted, result);
        this.namespace?.to(gameId).emit(SocketEvent.CombatTurnStart, result);
    }

    private async handleAction(socket: Socket, data: IActionData): Promise<void> {
        const { gameId, currentPlayerName, targetName } = data;
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const allowed = await this.gameplayService.actionService.canUseAction(gameId, currentPlayerName, targetName);

        if (!allowed) {
            socket.emit(SocketEvent.ActionError, { message: 'Action non autorisée' });
            return;
        }

        const handledAsFlagAction = await this.handleCtfFlagAction(activeGame, data);
        if (handledAsFlagAction) {
            return;
        }
        await this.combatManager(gameId, currentPlayerName, targetName);
    }

    private async handleCtfFlagAction(activeGame: IActiveGame, data: IActionData): Promise<boolean> {
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
            this.namespace?.to(gameId).emit(SocketEvent.GiveFlag, flagActionData);
            return true;
        }

        const canTakeFlag = await this.gameplayService.actionService.canTakeFlag(targetName, gameId);
        if (canTakeFlag) {
            const flagActionData = await this.gameplayService.actionService.flagActionRequest(currentPlayerName, targetName, gameId);
            this.pendingFlagRequestsByGameId.set(gameId, { requesterName: currentPlayerName, targetPlayerName: targetName });
            this.namespace?.to(gameId).emit(SocketEvent.TakeFlag, flagActionData);
            return true;
        }

        return true;
    }
    emitVirtualPlayerJoined(activeGame: IActiveGame) {
        const gameId = activeGame._id.toString();
        this.namespace?.to(gameId).emit(SocketEvent.PlayersUpdated, activeGame.players);
    }
}
