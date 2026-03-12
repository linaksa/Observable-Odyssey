import { ICharacter, Position } from '@common/character';
import { Namespaces } from '@common/namespaces';
import { PlayerMovedResult } from '@common/playerMovedResult';
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


                // Initialise la partie
                await this.gameplayService.startGameService.initializeGame(activeGameId);

                // Notifie tous les joueurs avec les positions mises à jour
                const updatedGame = await this.activeGameService.getActiveGameById(activeGameId);
                this.namespace?.to(activeGameId).emit(SocketEvent.PlayersUpdated, updatedGame.players);

                // Notifie tous les joueurs
                this.namespace?.to(activeGameId).emit(SocketEvent.GameStarted, activeGameId);

                // Démarre le tour du premier joueur
                this.gameplayService.turnService.startTurn(activeGameId);
            });
            // =======================
            // Déplacement d'un joueur
            // =======================
            socket.on(SocketEvent.PlayerMove, async (data: { gameId: string; playerId: string; direction: Position }) => {
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
            socket.on(SocketEvent.Attack, async (data: { gameId: string; attackerName: string; defenderName: string }) => {
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
            /**
             * =========================
             * END TURN (bouton finir tour)
             * =========================
             */
            socket.on(SocketEvent.EndTurn, (gameId: string) => {
                this.gameplayService.turnService.endTurn(gameId);
            });
            // =======================
            // Abandon d'un joueur
            // =======================
            socket.on(SocketEvent.PlayerAbandon, async (data: { gameId: string; playerId: string }) => {
                const { gameId, playerId } = data;
                this.gameplayService.endGameService.handlePlayerAbandon(gameId, playerId);

                // pour notifier tous les autres joueurs que ce joueur a abandonné ( peut etre pas necessaire)
                this.namespace?.to(gameId).emit(SocketEvent.PlayerAbandoned, { playerId });

                const gameEnded = await this.gameplayService.endGameService.checkEndGame(gameId);
                if (gameEnded) {
                    this.namespace?.to(gameId).emit(SocketEvent.GameEnded, { winner: null }); // Pas de gagnant clair, tous les autres ont abandonné
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

    private setSocketPlayerName(socket: Socket, gameId: string, playerName: string): void {
        const data = socket.data as { playerNamesByGameId?: Record<string, string> };
        if (!data.playerNamesByGameId) {
            data.playerNamesByGameId = {};
        }
        data.playerNamesByGameId[gameId] = playerName;
    }
}

