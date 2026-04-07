import { ActiveGameListSocketsService } from '@app/services/active-game/active-game-list-sockets.service';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { ActionService } from '@app/services/gameplay/action-service';
import { CombatService } from '@app/services/gameplay/combat-service';
import { DoorService } from '@app/services/gameplay/door-service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { MovementService } from '@app/services/gameplay/movement-service';
import { SanctuaryService } from '@app/services/gameplay/sanctuary-service';
import { StartGameService } from '@app/services/gameplay/start-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { ChatService } from '@app/services/realtime/chat.service';
import { CtfFlagActionService } from '@app/services/realtime/ctf-flag-action.service';
import { DebugSocketService } from '@app/services/realtime/debug-socket.service';
import { GameSessionService } from '@app/services/realtime/game-session.service';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ItemType } from '@common/items';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';
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
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
        saveActiveGameById: sinon.SinonStub;
    };
    let turnService: Partial<TurnService>;
    let startGameService: Partial<StartGameService>;
    let movementService: Partial<MovementService>;
    let actionService: Partial<ActionService>;
    let combatService: Partial<CombatService>;
    let doorService: Partial<DoorService>;
    let sanctuaryService: Partial<SanctuaryService>;
    let endGameService: Partial<EndGameService>;
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

        const activeGame: Partial<IActiveGame> = {
            _id: 'game-1',
            game: {
                board: {
                    cells: [[CellType.Empty]],
                    items: [{ itemType: ItemType.LifeSanctuary, x: 1, y: 1, size: 4, active: true }],
                },
            } as IActiveGame['game'],
            players: [],
            turnOrder: [],
            currentPlayerIndex: 0,
            isFinished: false,
            winner: null,
            messages: [],
            isDebugMode: false,
            organizerName: 'Alice',
            maxPlayerCount: 2,
            turnIsInPreparation: false,
            hasFlagId: null,
            turnStartTimeStamp: 0,
            currentAttack: null,
            manipulatedDoors: [],
            usedSanctuaries: [],
            flagHolderHistory: [],
        };

        activeGameService = {
            getActiveGameById: sinon.stub().resolves(activeGame),
            saveActiveGameById: sinon.stub().resolves(activeGame),
        };

        combatService = {
            cancelCombat: sinon.stub().resolves(null),
        };
        endGameService = {
            checkIfOrganizer: sinon.stub().resolves(false),
            checkEndGame: sinon.stub().resolves(false),
            handlePlayerAbandon: sinon.stub().resolves(),
        };
        startGameService = {
            initializeGame: sinon.stub().resolves(),
        };
        movementService = {
            movePlayer: sinon.stub().resolves({ newPosition: { x: 0, y: 0 }, movementLeft: 1 }),
            getReachablePositions: sinon.stub().resolves([{ x: 0, y: 0 }]),
        };
        actionService = {
            canUseActionAnyPlayer: sinon.stub().resolves(true),
            canUseAction: sinon.stub().resolves(true),
            applyCombatTurn: sinon.stub().resolves(false),
        };
        doorService = {
            toggleDoor: sinon.stub().resolves({
                playerId: 'Alice',
                position: { x: 1, y: 1 },
                cellType: CellType.OpenDoor,
                actionsLeft: 0,
            }),
        };
        sanctuaryService = {
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
        };
        turnService = {
            startTurn: sinon.stub().resolves(),
            endTurn: sinon.stub().resolves(),
            suspendTurn: sinon.stub().resolves(),
            startCombatTimer: sinon.stub(),
            clearCombatTimer: sinon.stub(),
        };

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
            combatService as unknown as CombatService,
            endGameService as unknown as EndGameService,
            turnService as unknown as TurnService,
            activeGameListSocketService as unknown as ActiveGameListSocketsService,
        );

        gameplayActionService = new GameplayActionService(
            turnService as TurnService,
            startGameService as StartGameService,
            movementService as MovementService,
            doorService as DoorService,
            sanctuaryService as SanctuaryService,
            endGameService as EndGameService,
            gameSessionService,
            activeGameService as unknown as ActiveGameService,
            actionService as ActionService,
            new CtfFlagActionService(actionService as ActionService),
        );

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
