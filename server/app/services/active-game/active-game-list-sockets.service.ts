import { SocketService } from '@app/services/realtime/socket.service';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Service } from 'typedi';

@Service()
export class ActiveGameListSocketsService {
    constructor(private readonly socketService: SocketService) {}

    initialize() {
        this.socketService.createNamespace(Namespaces.ActiveGameAdmin);
    }

    emitJoinableGamesUpdated(activeGameId: string): void {
        this.socketService.emit(Namespaces.ActiveGameAdmin, SocketEvent.JoinableGamesUpdated, activeGameId);
    }
}
