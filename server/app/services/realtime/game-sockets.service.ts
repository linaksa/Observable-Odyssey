import { ActiveGameListSocketsService } from '@app/services/active-game/active-game-list-sockets.service';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { ChatService } from '@app/services/realtime/chat.service';
import { DebugSocketService } from '@app/services/realtime/debug-socket.service';
import { GameSessionService } from '@app/services/realtime/game-session.service';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/activeGame';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import {
    IAbandonData,
    IActionData,
    IAttackPostureData,
    IDoorToggleData,
    IFlagDecisionData,
    IJoinGamePayload,
    IPlayerMoveData,
    ISanctuaryInteractionData,
} from '@common/socket-payloads';
import { Namespace, Socket } from 'socket.io';
import { Service } from 'typedi';

@Service()
export class GameSocketsService {
    private namespace?: Namespace;

    /* eslint-disable max-params */
    constructor(
        private readonly socketService: SocketService,
        private readonly debugSocketService: DebugSocketService,
        private readonly activeGameService: ActiveGameService,
        private readonly chatService: ChatService,
        private readonly activeGameListSocketService: ActiveGameListSocketsService,
        private readonly gameSessionService: GameSessionService,
        private readonly gameplayActionService: GameplayActionService,
    ) {}

    initialize(): void {
        this.namespace = this.socketService.createNamespace(Namespaces.Game);

        this.namespace.on('connection', (socket: Socket) => {
            this.chatService.register(socket);
            this.debugSocketService.register(socket);

            socket.on(SocketEvent.JoinGame, async (payload: string | IJoinGamePayload) => {
                const { activeGameId, playerName } = this.gameSessionService.parseJoinGamePayload(payload);
                if (!activeGameId) {
                    return;
                }

                this.gameSessionService.leaveOtherGameRooms(socket, activeGameId);
                socket.join(activeGameId);
                if (playerName) {
                    this.gameSessionService.setSocketPlayerName(socket, activeGameId, playerName);
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
                if (!this.namespace) return;
                await this.gameSessionService.handlePlayerKick(data, this.namespace);
            });

            socket.on(SocketEvent.LeaveWaitingRoom, async (data: IAbandonData) => {
                if (!this.namespace) return;
                await this.gameSessionService.handleLeaveWaitingRoom(data, this.namespace, socket);
            });

            socket.on(SocketEvent.StartGame, async (activeGameId: string) => {
                if (!this.namespace) return;
                const started = await this.gameplayActionService.handleStartGame(activeGameId, socket, this.namespace);
                if (started) {
                    this.activeGameListSocketService.emitJoinableGamesUpdated(activeGameId);
                }
            });

            socket.on(SocketEvent.PlayerMove, async (data: IPlayerMoveData) => {
                if (!this.namespace) return;
                await this.gameplayActionService.handlePlayerMove(data, socket, this.namespace);
            });

            socket.on(SocketEvent.ToggleDoor, async (data: IDoorToggleData) => {
                if (!this.namespace) return;
                await this.gameplayActionService.handleToggleDoor(data, socket, this.namespace, this.emitGameLog.bind(this));
            });

            socket.on(SocketEvent.InteractSanctuary, async (data: ISanctuaryInteractionData) => {
                if (!this.namespace) return;
                await this.gameplayActionService.handleSanctuaryInteraction(data, socket, this.namespace, this.emitGameLog.bind(this));
            });

            socket.on(SocketEvent.Attack, async (data: IActionData) => {
                if (!this.namespace) return;
                await this.gameplayActionService.handleAction(data, socket, this.namespace);
            });

            socket.on(SocketEvent.ChooseAttackPosture, async (data: IAttackPostureData) => {
                if (!this.namespace) return;
                await this.gameplayActionService.handleChooseAttackPosture(data, this.namespace);
            });

            socket.on(SocketEvent.EndTurn, (gameId: string) => {
                this.gameplayActionService.handleEndTurn(gameId);
            });

            socket.on(SocketEvent.PlayerAbandon, async (data: IAbandonData) => {
                if (!this.namespace) return;
                await this.gameSessionService.handlePlayerAbandon(data, this.namespace, socket, this.emitGameLog.bind(this));
            });
            socket.on(SocketEvent.FlagTaken, async (data: IFlagDecisionData) => {
                if (!this.namespace) return;
                await this.gameplayActionService.handleFlagTaken(data, this.namespace);
            });
            socket.on(SocketEvent.FlagGiven, async (data: IFlagDecisionData) => {
                if (!this.namespace) return;
                await this.gameplayActionService.handleFlagGiven(data, this.namespace);
            });

            socket.on('disconnect', async () => {
                if (!this.namespace) return;
                await this.gameSessionService.handleDisconnect(socket, this.namespace, this.emitGameLog.bind(this));
            });
        });
    }

    emitVirtualPlayerJoined(activeGame: IActiveGame) {
        const gameId = activeGame._id.toString();
        this.namespace?.to(gameId).emit(SocketEvent.PlayersUpdated, activeGame.players);
    }

    private emitGameLog(gameId: string, message: string): void {
        this.gameplayActionService.emitGameLogToRoom(gameId, message, this.namespace);
    }
}
