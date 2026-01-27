import { Server as HttpServer } from 'http';
import { Server as IOServer } from 'socket.io';
import { Service } from 'typedi';

@Service()
export class AdminSocketsService {
    private sio: IOServer;

    initialize(server: HttpServer) {
        this.sio = new IOServer(server, {
            transports: ['websocket'],
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
            },
            path: '/ws/admin',
        });
    }

    emitNewData() {
        if (!this.sio) {
            throw new Error('AdminSocketsService not initialized. Call initialize() first.');
        }
        this.sio.emit('new-games');
    }
}
