import { Application } from '@app/app';
import * as http from 'http';
import { AddressInfo } from 'net';
import { Container, Service } from 'typedi';
import { ActiveGameListSocketsService } from './services/active-game/active-game-list-sockets.service';
import { AdminSocketsService } from './services/admin/admin-sockets.service';
import { TurnService } from './services/gameplay/turn-service';
import { GameSocketsService } from './services/realtime/game-sockets.service';
import { SocketService } from './services/realtime/socket.service';
import { VirtualPlayerService } from './services/virtual-player/virtual-player.service';

@Service()
export class Server {
    private static readonly appPort: string | number | boolean = Server.normalizePort(process.env.PORT || '3000');
    private static readonly decimalBase: number = 10;
    private server?: http.Server;

    constructor(private readonly application: Application) {}

    private static normalizePort(val: number | string): number | string | boolean {
        const port: number = typeof val === 'string' ? parseInt(val, this.decimalBase) : val;
        return isNaN(port) ? val : port >= 0 ? port : false;
    }

    init(): void {
        this.application.app.set('port', Server.appPort);

        this.server = http.createServer(this.application.app);

        // Avoid circular dependencies issues, as socketService needs httpServer
        const socketService = Container.get(SocketService);
        socketService.initialize(this.server);

        const adminSocketsService = Container.get(AdminSocketsService);
        adminSocketsService.initialize();
        const gameSocketsService = Container.get(GameSocketsService);
        gameSocketsService.initialize();
        const activeGameListSocketsService = Container.get(ActiveGameListSocketsService);
        activeGameListSocketsService.initialize();

        // Wire up virtual player turn handler to break circular dependency
        const turnService = Container.get(TurnService);
        const virtualPlayerService = Container.get(VirtualPlayerService);
        turnService.setVirtualPlayerTurnHandler((player, game) => virtualPlayerService.startTurn(player, game));

        this.server.listen(Server.appPort);
        this.server.on('error', (error: NodeJS.ErrnoException) => this.onError(error));
        this.server.on('listening', () => this.onListening());
    }

    private onError(error: NodeJS.ErrnoException): void {
        if (error.syscall !== 'listen') {
            throw error;
        }
        const bind: string = typeof Server.appPort === 'string' ? 'Pipe ' + Server.appPort : 'Port ' + Server.appPort;
        switch (error.code) {
            case 'EACCES':
                // eslint-disable-next-line no-console
                console.error(`${bind} requires elevated privileges`);
                process.exit(1);
                break;
            case 'EADDRINUSE':
                // eslint-disable-next-line no-console
                console.error(`${bind} is already in use`);
                process.exit(1);
                break;
            default:
                throw error;
        }
    }

    /**
     * Occurs when the server starts listening on the port.
     */
    private onListening(): void {
        const addr = this.server.address() as AddressInfo;
        const bind: string = typeof addr === 'string' ? `pipe ${addr}` : `port ${addr.port}`;
        // eslint-disable-next-line no-console
        console.log(`Listening on ${bind}`);
    }
}
