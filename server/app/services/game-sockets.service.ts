import { ICharacter } from '@common/character';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Namespace } from 'socket.io';
import { Service } from 'typedi';
import { ActiveGameService } from './active-game.service';
import { SocketService } from './socket.service';

@Service()
export class GameSocketsService {
    private namespace?: Namespace;

    constructor(
        private readonly socketService: SocketService,
        private readonly activeGameService: ActiveGameService,
    ) {}

    initialize(): void {
        this.namespace = this.socketService.createNamespace(Namespaces.Game);
        this.namespace.on('connection', (socket) => {
            socket.on(SocketEvent.JoinGame, async (activeGameId: string) => {
                if (!activeGameId) {
                    return;
                }
                socket.join(activeGameId);

                try {
                    const activeGame = await this.activeGameService.getActiveGameById(activeGameId);
                    if (activeGame?.players) {
                        this.namespace?.to(activeGameId).emit(SocketEvent.PlayersUpdated, activeGame.players);
                    }
                } catch {
                    return;
                }
            });

            socket.on(SocketEvent.StartGame, (activeGameId: string) => {
                if (!activeGameId) {
                    return;
                }
                
                if (!socket.rooms.has(activeGameId)) {
                    return;
                }
                this.namespace?.to(activeGameId).emit(SocketEvent.StartGame, activeGameId);
            });
        });
    }

    emitPlayersUpdated(activeGameId: string, players: ICharacter[]): void {
        if (!this.namespace || !activeGameId) {
            return;
        }
        this.namespace.to(activeGameId).emit(SocketEvent.PlayersUpdated, players);
    }
}
