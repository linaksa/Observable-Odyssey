import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { IAbandonData, IJoinGamePayload } from '@common/socket-payloads';
import { SocketEvent } from '@common/socket-events';
import { Namespace, Socket } from 'socket.io';
import { Service } from 'typedi';
import { GameSessionService } from './game-session.service';
import { GameplayLogService } from './gameplay-log.service';

@Service()
export class GameSocketSessionEventsService {
    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly gameSessionService: GameSessionService,
        private readonly gameplayLogService: GameplayLogService,
    ) {}

    register(socket: Socket, namespace: Namespace): void {
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
                    namespace.to(activeGameId).emit(SocketEvent.PlayersUpdated, activeGame.players);
                }
            } catch {
                return;
            }
        });

        socket.on(SocketEvent.PlayerKick, async (data: IAbandonData) => {
            await this.gameSessionService.handlePlayerKick(data, namespace);
        });

        socket.on(SocketEvent.LeaveWaitingRoom, async (data: IAbandonData) => {
            await this.gameSessionService.handleLeaveWaitingRoom(data, namespace, socket);
        });

        socket.on(SocketEvent.PlayerAbandon, async (data: IAbandonData) => {
            await this.gameSessionService.handlePlayerAbandon(data, namespace, socket, this.emitGameLog.bind(this, namespace));
        });

        socket.on('disconnect', async () => {
            await this.gameSessionService.handleDisconnect(socket, namespace, this.emitGameLog.bind(this, namespace));
        });
    }

    private emitGameLog(namespace: Namespace, gameId: string, message: string): void {
        void namespace;
        this.gameplayLogService.emitGameLogToRoom(gameId, message);
    }
}
