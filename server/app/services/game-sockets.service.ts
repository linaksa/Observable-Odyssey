import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';
import { Namespaces } from '@common/namespaces';
import { PlayerMovedResult } from '@common/playerMovedResult';
import { SocketEvent } from '@common/socket-events';
import { IAbandonData, IAttackData, IDebugToggleState, IJoinGamePayload, IPlayerMoveData, ISocketData } from '@common/socket-payloads';
import { Namespace, Socket } from 'socket.io';
import { Service } from 'typedi';
import { ActiveGameListSocketsService } from './active-game-list-sockets.service';
import { ActiveGameService } from './active-game.service';
import { ChatService } from './chat.service';
import { DebugSocketService } from './debug-socket.service';
import { GameplayServices } from './gameplay-dependencies.service';
import { SocketService } from './socket.service';

@Service()
export class GameSocketsService {
    private namespace?: Namespace;

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
                    this.namespace?.to(gameId).emit(SocketEvent.GameCanceled);
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
                    if (reachable.length === 0) {
                        await this.gameplayService.turnService.endTurn(gameId);
                    }
                } catch (error) {
                    socket.emit(SocketEvent.PlayerMoveError, { message: (error as Error).message ?? 'Déplacement non autorisé' });
                }
            });
            // =======================
            // Combat
            // =======================
            socket.on(SocketEvent.Attack, async (data: IAttackData) => {
                const { gameId, attackerName, defenderName } = data;

                const allowed = this.gameplayService.combatService.canAttack(gameId, attackerName, defenderName);
                if (!allowed) {
                    socket.emit(SocketEvent.AttackError, { message: 'Attaque non autorisée' });
                    return;
                }

                const result = this.gameplayService.combatService.resolveCombat(gameId, attackerName, defenderName);
                this.namespace?.to(gameId).emit(SocketEvent.AttackResult, {
                    attackerName,
                    defenderName,
                    attackerVictories: (await result).attackerVictories,
                    defenderNewPosition: (await result).defenderNewPosition,
                });

                const gameEnded = await this.gameplayService.endGameService.checkEndGame(gameId);
                if (gameEnded) {
                    this.namespace?.to(gameId).emit(SocketEvent.GameEnded, { winner: attackerName });
                }
            });
            // =======================
            // End turn
            // =======================
            socket.on(SocketEvent.EndTurn, (gameId: string) => {
                this.gameplayService.turnService.endTurn(gameId);
            });
            // =======================
            // Player abandon
            // =======================
            socket.on(SocketEvent.PlayerAbandon, async (data: IAbandonData) => {
                const { gameId, playerId } = data;
                await this.gameplayService.endGameService.handlePlayerAbandon(playerId, gameId);

                const updatedGame = await this.activeGameService.getActiveGameById(gameId);
                await this.disableDebugModeIfOrganizerLeft(gameId, playerId, updatedGame);

                // notify other players about the quitting player
                this.namespace?.to(gameId).emit(SocketEvent.PlayerAbandoned, { playerId });
                const gameEnded = await this.gameplayService.endGameService.checkEndGame(gameId);
                if (gameEnded) {
                    this.namespace?.to(gameId).emit(SocketEvent.GameEnded, { winner: null });
                }
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

        const refreshedGame = await this.activeGameService.getActiveGameById(gameId);
        this.namespace?.to(gameId).emit(SocketEvent.PlayersUpdated, refreshedGame.players);
        this.namespace?.to(gameId).emit(SocketEvent.PlayerAbandoned, { playerId });

        await this.disableDebugModeIfOrganizerLeft(gameId, playerId, refreshedGame);

        const isCurrentPlayer = refreshedGame.turnOrder[refreshedGame.currentPlayerIndex] === playerId;
        const gameEnded = await this.gameplayService.endGameService.checkEndGame(gameId);
        if (gameEnded) {
            this.namespace?.to(gameId).emit(SocketEvent.GameEnded, { winner: null });
        }
        if (isCurrentPlayer) {
            await this.gameplayService.turnService.endTurn(gameId);
        }
    }
    emitPlayersUpdated(activeGameId: string, players: ICharacter[]): void {
        if (!this.namespace || !activeGameId) {
            return;
        }

        this.namespace.to(activeGameId).emit(SocketEvent.PlayersUpdated, players);
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

    private async disableDebugModeIfOrganizerLeft(gameId: string, playerId: string, activeGame: IActiveGame): Promise<void> {
        const gameHasStarted = activeGame.turnOrder.length > 0;
        if (playerId !== activeGame.organizerName || !gameHasStarted || !activeGame.isDebugMode) {
            return;
        }

        activeGame.isDebugMode = false;
        await this.activeGameService.saveActiveGameById(gameId, activeGame);
        const payload: IDebugToggleState = { playerName: playerId, isDebugMode: false };
        this.namespace?.to(gameId).emit(SocketEvent.DebugToggle, payload);
    }
}
