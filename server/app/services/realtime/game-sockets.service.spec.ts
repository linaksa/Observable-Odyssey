import { GameSocketConnectionService } from '@app/services/realtime/game-socket-connection.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/active-game';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { GameSocketsService } from './game-sockets.service';

describe('GameSocketsService', () => {
    let service: GameSocketsService;
    let socketService: { createNamespace: sinon.SinonStub };
    let gameSocketConnectionService: { register: sinon.SinonStub };
    let namespace: { on: sinon.SinonStub; to: sinon.SinonStub };
    let connectionHandler: ((socket: unknown) => void) | undefined;
    let roomEmitSpy: sinon.SinonSpy;
    let fakeSocket: { id: string };

    beforeEach(() => {
        roomEmitSpy = sinon.spy();
        connectionHandler = undefined;
        fakeSocket = { id: 'socket-id' };

        namespace = {
            on: sinon.stub().callsFake((event: string, handler: (socket: unknown) => void) => {
                if (event === 'connection') {
                    connectionHandler = handler;
                }
            }),
            to: sinon.stub().returns({ emit: roomEmitSpy }),
        };

        socketService = {
            createNamespace: sinon.stub().returns(namespace),
        };

        gameSocketConnectionService = {
            register: sinon.stub(),
        };

        service = new GameSocketsService(
            socketService as unknown as SocketService,
            gameSocketConnectionService as unknown as GameSocketConnectionService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should create game namespace and register connection handler', () => {
        service.initialize();

        expect(socketService.createNamespace.calledOnceWith(Namespaces.Game)).to.equal(true);
        expect(namespace.on.calledOnce).to.equal(true);
        expect(connectionHandler).to.not.equal(undefined);
    });

    it('should delegate connected sockets to connection registrar', () => {
        service.initialize();
        connectionHandler?.(fakeSocket as never);

        expect(gameSocketConnectionService.register.calledOnceWith(fakeSocket, namespace)).to.equal(true);
    });

    it('should emit players updated when a virtual player joins', () => {
        service.initialize();

        const activeGame = {
            _id: 'game-1',
            players: [{ name: 'Alice' }],
        } as unknown as IActiveGame;

        service.emitVirtualPlayerJoined(activeGame);

        expect(namespace.to.calledWith('game-1')).to.equal(true);
        expect(roomEmitSpy.calledWith(SocketEvent.PlayersUpdated, activeGame.players)).to.equal(true);
    });
});
