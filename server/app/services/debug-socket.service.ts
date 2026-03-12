import { SocketEvent } from '@common/socket-events';
import { Socket } from 'socket.io';
import { Service } from 'typedi';
import { ActiveGameService } from './active-game.service';

@Service()
export class DebugSocketService {
    constructor(private readonly activeGameService: ActiveGameService) {}

    register(socket: Socket): void {
        socket.on(SocketEvent.DebugToggle, async (playerName: string, activeGameId: string) => {
            if (!activeGameId) {
                return;
            }
            try {
                const activeGame = await this.activeGameService.getActiveGameById(activeGameId);

                if (activeGame.organizerName === playerName) {
                    activeGame.isDebugMode = !activeGame.isDebugMode;
                    socket.to(activeGameId).emit(SocketEvent.DebugToggle, playerName);
                    socket.emit(SocketEvent.DebugToggle, playerName);

                }
            } catch {
                return;
            }
        });
    }
}
