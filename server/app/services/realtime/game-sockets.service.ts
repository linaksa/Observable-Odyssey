import { GameSocketConnectionService } from '@app/services/realtime/game-socket-connection.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/active-game';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Namespace, Socket } from 'socket.io';
import { Service } from 'typedi';

@Service()
export class GameSocketsService {
    private namespace?: Namespace;

    constructor(
        private readonly socketService: SocketService,
        private readonly gameSocketConnectionService: GameSocketConnectionService,
    ) {}

    initialize(): void {
        this.namespace = this.socketService.createNamespace(Namespaces.Game);

        this.namespace.on('connection', (socket: Socket) => {
            if (!this.namespace) {
                return;
            }

            this.gameSocketConnectionService.register(socket, this.namespace);
        });
    }

    emitVirtualPlayerJoined(activeGame: IActiveGame) {
        const gameId = activeGame._id.toString();
        this.namespace?.to(gameId).emit(SocketEvent.PlayersUpdated, activeGame.players);
    }
}
