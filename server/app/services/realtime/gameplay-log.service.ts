import { SocketService } from '@app/services/realtime/socket.service';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { IGameLogPayload, ISocketData } from '@common/socket-payloads';
import { Service } from 'typedi';

@Service()
export class GameplayLogService {
    constructor(private readonly socketService: SocketService) {}

    emitGameLogToRoom(gameId: string, message: string): void {
        if (!gameId || !message.trim()) {
            return;
        }

        this.socketService.getNamespace(Namespaces.Game).to(gameId).emit(SocketEvent.GameLog, this.createGameLogPayload(message));
    }

    emitPrivateGameLogToPlayers(gameId: string, playerNames: string[], message: string): void {
        if (!gameId || !message.trim()) {
            return;
        }

        const namespace = this.socketService.getNamespace(Namespaces.Game);
        const targetPlayerNames = new Set(playerNames);
        if (targetPlayerNames.size === 0) {
            return;
        }

        const payload = this.createGameLogPayload(message);
        namespace.sockets.forEach((playerSocket) => {
            if (!playerSocket.rooms.has(gameId)) {
                return;
            }

            const socketData = playerSocket.data as ISocketData;
            const socketPlayerName = socketData.playerNamesByGameId?.[gameId];
            if (!socketPlayerName || !targetPlayerNames.has(socketPlayerName)) {
                return;
            }

            playerSocket.emit(SocketEvent.GameLogPrivate, payload);
        });
    }

    private createGameLogPayload(message: string): IGameLogPayload {
        return { message, postedAt: new Date().toISOString() };
    }
}
