import { ICharacter } from '@common/character';
import { Namespaces } from '@common/namespaces';
import { PlayerMovedResult } from '@common/playerMovedResult';
import { SocketEvent } from '@common/socket-events';
import { IAbandonData, IAttackData, IJoinGamePayload, IPlayerMoveData, ISocketData } from '@common/socket-payloads';
import { Namespace, Socket } from 'socket.io';
import { Service } from 'typedi';
import { ActiveGameService } from './active-game.service';
import { ChatService } from './chat.service';
import { DebugSocketService } from './debug-socket.service';
import { GameplayServices } from './gameplay-dependencies.service';
import { SocketService } from './socket.service';

@Service()
export class GameSocketsService {
    private namespace?: Namespace;
    constructor(
        private readonly gameplayService: GameplayServices,
        private readonly socketService: SocketService,
        private readonly debugSocketService: DebugSocketService,
        private readonly activeGameService: ActiveGameService,
        private readonly chatService: ChatService,
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
                this.namespace?.to(gameId).emit(SocketEvent.PlayersUpdated, updatedGame.players);
                this.namespace?.to(gameId).emit(SocketEvent.PlayerAbandoned, { playerId });


                // If the organizer leaves during an active game, disable debug mode instead of ending the game
                const gameHasStarted = updatedGame.turnOrder.length > 0;
                if (playerId === updatedGame.organizerName && gameHasStarted && updatedGame.isDebugMode) {
                    updatedGame.isDebugMode = false;
                    await this.activeGameService.saveActiveGameById(gameId, updatedGame);
                    this.namespace?.to(gameId).emit(SocketEvent.DebugToggle, playerId);
                }

                const isCurrentPlayer = updatedGame.turnOrder[updatedGame.currentPlayerIndex] === playerId;

                const gameEnded = await this.gameplayService.endGameService.checkEndGame(gameId);
                if (gameEnded) {
                    this.namespace?.to(gameId).emit(SocketEvent.GameEnded, { winner: null });
                }

                // If it was this player's turn, end it immediately (clears timers; no-op if game is finished)
                if (isCurrentPlayer) {
                    await this.gameplayService.turnService.endTurn(gameId);
                }
            });

            // =======================
            // Disconnect (e.g. page refresh)
            // =======================
            socket.on('disconnect', async () => {
                const data = socket.data as ISocketData;
                const playerNamesByGameId = data.playerNamesByGameId;
                if (!playerNamesByGameId) return;

                for (const [gameId, playerId] of Object.entries(playerNamesByGameId)) {
                    await this.gameplayService.endGameService.handlePlayerAbandon(playerId, gameId);

                    const updatedGame = await this.activeGameService.getActiveGameById(gameId);
                    this.namespace?.to(gameId).emit(SocketEvent.PlayersUpdated, updatedGame.players);
                    this.namespace?.to(gameId).emit(SocketEvent.PlayerAbandoned, { playerId });

                    // If the organizer leaves during an active game, disable debug mode instead of ending the game
                    const gameHasStarted = updatedGame.turnOrder.length > 0;
                    if (playerId === updatedGame.organizerName && gameHasStarted && updatedGame.isDebugMode) {
                        updatedGame.isDebugMode = false;
                        await this.activeGameService.saveActiveGameById(gameId, updatedGame);
                        this.namespace?.to(gameId).emit(SocketEvent.DebugToggle, playerId);
                    }

                    const isCurrentPlayer = updatedGame.turnOrder[updatedGame.currentPlayerIndex] === playerId;

                    const gameEnded = await this.gameplayService.endGameService.checkEndGame(gameId);
                    if (gameEnded) {
                        this.namespace?.to(gameId).emit(SocketEvent.GameEnded, { winner: null });
                    }

                    // If it was this player's turn, end it immediately (clears timers; no-op if game is finished)
                    if (isCurrentPlayer) {
                        await this.gameplayService.turnService.endTurn(gameId);
                    }
                }
            });
        });
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
}
