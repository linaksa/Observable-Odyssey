import { ICharacter, Position } from '@common/character';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
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

            socket.on(SocketEvent.JoinGame, async (payload: string | { activeGameId: string; playerName?: string }) => {
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
                // Server receives the start-game event from the Start button
                if (!activeGameId) {
                    return;
                }

                if (!socket.rooms.has(activeGameId)) {
                    return;
                }

                // The game is already active, so do not restart the first turn
                if (this.activeGameService.isGameActive(activeGameId)) {
                    return;
                }

                const currentActiveGame = await this.activeGameService.getActiveGameById(activeGameId);
                if (!currentActiveGame || !currentActiveGame.players?.length) {
                    return;
                }

                if (currentActiveGame.players.length < 2) {
                    socket.emit(SocketEvent.StartGameError, {
                        message: 'Il faut au moins 2 joueurs pour démarrer la partie.',
                    });
                    return;
                }

                // Keep the game state in memory
                this.activeGameService.addActiveGameToMemory(currentActiveGame);

                // Initialize the game state
                this.gameplayService.startGameService.initializeGame(activeGameId);

                const activeGameDoc = this.activeGameService.getActiveGameFromMemory(activeGameId) as unknown as {
                    save: () => Promise<{ players: ICharacter[] }>;
                };
                const savedActiveGame = await activeGameDoc.save();
                this.namespace?.to(activeGameId).emit(SocketEvent.PlayersUpdated, savedActiveGame.players);

                // Notify all players in the room
                this.namespace?.to(activeGameId).emit(SocketEvent.StartGame, activeGameId);
                this.namespace?.to(activeGameId).emit(SocketEvent.GameStarted, { activeGame: currentActiveGame });

                // Start the first player's turn
                this.gameplayService.turnService.startTurn(activeGameId);
            });

            // =======================
            // Player movement
            // =======================
            socket.on(SocketEvent.PlayerMove, (data: { gameId: string; playerId: string; direction: Position }) => {
                const { gameId, playerId, direction } = data;

                const canMove = this.gameplayService.movementService.canMove(playerId, gameId, direction);
                if (!canMove) {
                    socket.emit(SocketEvent.PlayerMoveError, { message: 'Déplacement non autorisé' });
                    return;
                }

                const newPosition = this.gameplayService.movementService.movePlayer(playerId, gameId, direction);
                this.namespace?.to(gameId).emit(SocketEvent.PlayerMoved, { playerId, newPosition });
            });

            // =======================
            // Combat
            // =======================
            socket.on(SocketEvent.Attack, (data: { gameId: string; attackerName: string; defenderName: string }) => {
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
                    attackerVictories: result.attackerVictories,
                    defenderNewPosition: result.defenderNewPosition,
                });

                const gameEnded = this.gameplayService.endGameService.checkEndGame(gameId);
                if (gameEnded) {
                    this.namespace?.to(gameId).emit(SocketEvent.GameEnded, { winner: attackerName });
                }
            });

            /**
             * =========================
             * END TURN (end-turn button)
             * =========================
             */
            socket.on(SocketEvent.EndTurn, (payload: string | { gameId: string; playerName?: string }) => {
                const { gameId, playerName } = this.parseEndTurnPayload(payload);
                if (!gameId) {
                    return;
                }

                const activeGame = this.activeGameService.getActiveGameFromMemory(gameId);
                if (!activeGame?.turnOrder?.length) {
                    return;
                }

                const activePlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
                const requesterName = this.getSocketPlayerName(socket, gameId) ?? playerName;

                if (!requesterName || requesterName !== activePlayerName) {
                    return;
                }

                this.gameplayService.turnService.endTurn(gameId);
            });

            // =======================
            // Player abandonment
            // =======================
            socket.on(SocketEvent.PlayerAbandon, (data: { gameId: string; playerId: string }) => {
                const { gameId, playerId } = data;
                this.gameplayService.endGameService.handlePlayerAbandon(gameId, playerId);

                // Notify other players that this player abandoned.
                this.namespace?.to(gameId).emit(SocketEvent.PlayerAbandoned, { playerId });

                const gameEnded = this.gameplayService.endGameService.checkEndGame(gameId);
                if (gameEnded) {
                    this.namespace?.to(gameId).emit(SocketEvent.GameEnded, { winner: null });
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

    private parseJoinGamePayload(payload: string | { activeGameId: string; playerName?: string }): { activeGameId: string; playerName?: string } {
        if (typeof payload === 'string') {
            return { activeGameId: payload };
        }
        return {
            activeGameId: payload?.activeGameId ?? '',
            playerName: payload?.playerName,
        };
    }

    private parseEndTurnPayload(payload: string | { gameId: string; playerName?: string }): { gameId: string; playerName?: string } {
        if (typeof payload === 'string') {
            return { gameId: payload };
        }
        return {
            gameId: payload?.gameId ?? '',
            playerName: payload?.playerName,
        };
    }

    private setSocketPlayerName(socket: Socket, gameId: string, playerName: string): void {
        const data = socket.data as { playerNamesByGameId?: Record<string, string> };
        if (!data.playerNamesByGameId) {
            data.playerNamesByGameId = {};
        }
        data.playerNamesByGameId[gameId] = playerName;
    }

    private getSocketPlayerName(socket: Socket, gameId: string): string | undefined {
        const data = socket.data as { playerNamesByGameId?: Record<string, string> };
        return data.playerNamesByGameId?.[gameId];
    }
}

