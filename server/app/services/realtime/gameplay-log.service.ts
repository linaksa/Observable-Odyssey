import { SocketEvent } from '@common/socket-events';
import { IGameLogPayload } from '@common/socket-payloads';
import { Namespace } from 'socket.io';
import { Service } from 'typedi';

@Service()
export class GameplayLogService {
    emitGameLogToRoom(gameId: string, message: string, namespace?: Namespace): void {
        if (!namespace || !gameId || !message.trim()) {
            return;
        }
        namespace.to(gameId).emit(SocketEvent.GameLog, this.createGameLogPayload(message));
    }

    private createGameLogPayload(message: string): IGameLogPayload {
        return { message, postedAt: new Date().toISOString() };
    }
}
