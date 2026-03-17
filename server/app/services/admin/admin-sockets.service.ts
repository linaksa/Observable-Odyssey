import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Service } from 'typedi';
import { SocketService } from '@app/services/realtime/socket.service';

@Service()
export class AdminSocketsService {
    constructor(private readonly socketService: SocketService) {}

    initialize() {
        this.socketService.createNamespace(Namespaces.Admin);
    }

    emitNewData() {
        this.socketService.emit(Namespaces.Admin, SocketEvent.GameModified);
    }
}
