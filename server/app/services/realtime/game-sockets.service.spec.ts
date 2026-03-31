import { expect } from 'chai';
import * as sinon from 'sinon';
import { ActiveGameListSocketsService } from '@app/services/active-game/active-game-list-sockets.service';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { GameplayServices } from '@app/services/gameplay/gameplay-dependencies.service';
import { ChatService } from '@app/services/realtime/chat.service';
import { DebugSocketService } from '@app/services/realtime/debug-socket.service';
import { GameSessionService } from '@app/services/realtime/game-session.service';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { CellType } from '@common/board';
import { ItemType } from '@common/items';
import { SocketEvent } from '@common/socket-events';
import { GameSocketsService } from './game-sockets.service';

describe('GameSocketsService', () => {
    let service: GameSocketsService;
    let socketService: {
        createNamespace: sinon.SinonStub;
    };
    let namespace: {
        on: sinon.SinonStub;
        to: sinon.SinonStub;
    };
    let connectionHandler: ((socket: unknown) => void) | undefined;
    let roomEmitSpy: sinon.SinonSpy;
    let socketHandlers: Map<string, (...args: unknown[]) => Promise<void> | void>;
    let activeGameService: Record<string, never>;
    let gameplayServices: GameplayServices;
    let chatService: {
        register: sinon.SinonStub;
    };
    let debugSocketService: {
        register: sinon.SinonStub;
    };
    let activeGameListSocketService: {
        emitJoinableGamesUpdated: sinon.SinonStub;
    };
    let gameSessionService: GameSessionService;
    let gameplayActionService: GameplayActionService;
    let fakeSocket: {
        on: sinon.SinonStub;
        join: sinon.SinonStub;
        emit: sinon.SinonSpy;
        rooms: Set<string>;
        data: Record<string, unknown>;
    };

    beforeEach(() => {
        roomEmitSpy = sinon.spy();
        socketHandlers = new Map();
        connectionHandler = undefined;

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

        activeGameService = {};

        gameplayServices = {
            endGameService: {
                checkIfOrganizer: sinon.stub().resolves(false),
                checkEndGame: sinon.stub().resolves(false),
                handlePlayerAbandon: sinon.stub().resolves(),
            },
            startGameService: {
                initializeGame: sinon.stub().resolves(),
            },
            movementService: {
                movePlayer: sinon.stub().resolves({ newPosition: { x: 0, y: 0 }, movementLeft: 1 }),
                getReachablePositions: sinon.stub().resolves([{ x: 0, y: 0 }]),
            },
            combatService: {
                canAttackAnyPlayer: sinon.stub().resolves(true),
                canAttack: sinon.stub().resolves(true),
                applyCombatTurn: sinon.stub().resolves(false),
            },
            doorService: {
                toggleDoor: sinon.stub().resolves({
                    playerId: 'Alice',
                    position: { x: 1, y: 1 },
                    cellType: CellType.OpenDoor,
                    actionsLeft: 0,
                }),
            },
            sanctuaryService: {
                interactSanctuary: sinon.stub().resolves({
                    playerId: 'Alice',
                    position: { x: 1, y: 1 },
                    itemType: ItemType.LifeSanctuary,
                    choice: 'standard',
                    succeeded: true,
                    actionsLeft: 0,
                    currentHealth: 6,
                    attackPoints: 4,
                    defensePoints: 4,
                    sanctuaryActive: false,
                    sanctuaryInactiveTurnsRemaining: 3,
                    fightSanctuaryUsed: false,
                    fightSanctuaryTurnsRemaining: 0,
                    fightSanctuaryBonus: 0,
                }),
            },
            turnService: {
                startTurn: sinon.stub().resolves(),
                endTurn: sinon.stub().resolves(),
                suspendTurn: sinon.stub().resolves(),
                startCombatTimer: sinon.stub(),
                clearCombatTimer: sinon.stub(),
            },
        } as unknown as GameplayServices;

        chatService = {
            register: sinon.stub(),
        };
        debugSocketService = {
            register: sinon.stub(),
        };
        activeGameListSocketService = {
            emitJoinableGamesUpdated: sinon.stub(),
        };

        gameSessionService = new GameSessionService(
            activeGameService as unknown as ActiveGameService,
            gameplayServices,
            activeGameListSocketService as unknown as ActiveGameListSocketsService,
        );

        gameplayActionService = new GameplayActionService(gameplayServices, activeGameService as unknown as ActiveGameService);

        fakeSocket = {
            on: sinon.stub().callsFake((event: string, handler: (...args: unknown[]) => Promise<void> | void) => {
                socketHandlers.set(event, handler);
                return fakeSocket;
            }),
            join: sinon.stub(),
            emit: sinon.spy(),
            rooms: new Set(['socket-id']),
            data: {},
        };

        service = new GameSocketsService(
            gameplayServices,
            socketService as unknown as SocketService,
            debugSocketService as unknown as DebugSocketService,
            activeGameService as unknown as ActiveGameService,
            chatService as unknown as ChatService,
            activeGameListSocketService as unknown as ActiveGameListSocketsService,
            gameSessionService,
            gameplayActionService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should emit a game log when a door is toggled', async () => {
        service.initialize();
        connectionHandler?.(fakeSocket as never);

        const toggleDoorHandler = socketHandlers.get(SocketEvent.ToggleDoor);
        expect(toggleDoorHandler).to.not.equal(undefined);

        await toggleDoorHandler?.({
            gameId: 'game-1',
            playerId: 'Alice',
            position: { x: 1, y: 1 },
        });

        expect(roomEmitSpy.calledWithMatch(SocketEvent.GameLog, { message: 'Alice a ouvert une porte.' })).to.equal(true);
        expect(roomEmitSpy.getCalls().some((call) => call.args[0] === SocketEvent.NewMessage)).to.equal(false);
    });

    it('should emit a game log when a sanctuary is used', async () => {
        service.initialize();
        connectionHandler?.(fakeSocket as never);

        const sanctuaryHandler = socketHandlers.get(SocketEvent.InteractSanctuary);
        expect(sanctuaryHandler).to.not.equal(undefined);

        await sanctuaryHandler?.({
            gameId: 'game-1',
            playerId: 'Alice',
            position: { x: 1, y: 1 },
            choice: 'standard',
        });

        expect(roomEmitSpy.calledWithMatch(SocketEvent.GameLog, { message: 'Alice a utilisé un sanctuaire de vie.' })).to.equal(true);
        expect(roomEmitSpy.getCalls().some((call) => call.args[0] === SocketEvent.NewMessage)).to.equal(false);
    });
});
