/* eslint-disable max-lines */
/**
 * Testing strategy — Active Game Service
 *
 * Approach:
 * - Keep each test focused on one behavior with deterministic mocks/spies.
 * - Validate both nominal flows and failure paths that could break UX/state.
 * - Assert side effects explicitly (state changes, emitted events, and service calls).
 *
 * Edge cases covered:
 * - Missing or invalid input guards and safe early returns.
 * - Error handling paths and fallback user-facing messaging.
 * - Cleanup/teardown behavior (unsubscribe/reset/disconnect) when applicable.
 */
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GameService } from '@app/services/admin/game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ToastService } from '@app/services/ui/toast.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { SanctuaryChoice } from '@common/info';
import { IItem, ItemType } from '@common/items';
import { IMessage } from '@common/message';
import { Namespaces } from '@common/namespaces';
import { CombatOutcome } from '@common/attackResult';
import { PlayerMovedResult } from '@common/playerMovedResult';
import { SocketEvent } from '@common/socket-events';
import { of, Subject } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ActiveGameService } from './active-game.service';

const MOVE_TOTAL_COLUMNS = 3;
const FAR_POSITION_INDEX = 3;
const LAST_GRAPH_NODE_INDEX = 3;
const DEFAULT_MOVEMENT_LEFT = 3;
const SANCTUARY_ITEM_SIZE = 4;
const MAX_PLAYER_COUNT = 4;
const PLAYER_INDEX_BOB = 1;
const TELEPORT_ROW = 2;
const TELEPORT_COL = 3;
const UNKNOWN_TILE_INDEX = 99;
const INTERACTION_ROW = 2;
const INTERACTION_COL = 3;

describe('ActiveGameService', () => {
    let service: ActiveGameService;
    let socketServiceSpy: jasmine.SpyObj<SocketService>;
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let toastServiceSpy: jasmine.SpyObj<ToastService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let gameServiceSpy: jasmine.SpyObj<GameService>;

    const eventStreams = new Map<string, Subject<unknown>>();

    const getEventStream = <T>(event: string): Subject<T> => {
        if (!eventStreams.has(event)) {
            eventStreams.set(event, new Subject<unknown>());
        }

        return eventStreams.get(event) as Subject<T>;
    };

    const emitEvent = <T>(event: string, payload: T): void => {
        getEventStream<T>(event).next(payload);
    };

    beforeEach(() => {
        socketServiceSpy = jasmine.createSpyObj<SocketService>('SocketService', ['connect', 'on', 'emit']);
        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer', 'clear']);
        toastServiceSpy = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
        routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
        routerSpy.navigate.and.resolveTo(true);
        gameServiceSpy = jasmine.createSpyObj<GameService>('GameService', ['getActiveGameById']);

        eventStreams.clear();
        socketServiceSpy.on.and.callFake(<T>(_namespace: string, event: string) => getEventStream<T>(event).asObservable());
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Alice'));
        gameServiceSpy.getActiveGameById.and.returnValue(of(createActiveGame([createCharacter('Alice')])));

        TestBed.configureTestingModule({
            providers: [
                ActiveGameService,
                { provide: SocketService, useValue: socketServiceSpy },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
                { provide: ToastService, useValue: toastServiceSpy },
                { provide: Router, useValue: routerSpy },
                { provide: GameService, useValue: gameServiceSpy },
            ],
        });

        service = TestBed.inject(ActiveGameService);
        service.activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice');
    });

    it('should connect to the game namespace on creation', () => {
        expect(socketServiceSpy.connect).toHaveBeenCalledWith(Namespaces.Game);
    });

    it('should update debug mode only when organizer toggles it', () => {
        service.activeGame.organizerName = 'Organizer';
        service.activeGame.isDebugMode = false;

        service.applyDebugModeState({ playerName: 'Guest', isDebugMode: true });
        expect(service.activeGame.isDebugMode).toBeFalse();
        expect(service.isDebugMode()).toBeFalse();

        service.applyDebugModeState({ playerName: 'Organizer', isDebugMode: true });
        expect(service.activeGame.isDebugMode).toBeTrue();
        expect(service.isDebugMode()).toBeTrue();
    });

    it('should ignore debug mode updates when no active game is loaded', () => {
        Object.assign(service as unknown as Record<string, unknown>, { activeGame: undefined });

        service.applyDebugModeState({ playerName: 'Organizer', isDebugMode: true });

        expect(service.isDebugMode()).toBeFalse();
    });

    it('should set active game state and join game room when fetch succeeds', () => {
        const fetchedGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Bob', 'remote-game-id');
        fetchedGame.isDebugMode = true;
        fetchedGame.currentPlayerIndex = PLAYER_INDEX_BOB;
        gameServiceSpy.getActiveGameById.and.returnValue(of(fetchedGame));

        service.setActiveGame('remote-game-id');

        expect(gameServiceSpy.getActiveGameById).toHaveBeenCalledWith('remote-game-id');
        expect(service.activeGame).toBe(fetchedGame);
        expect(service.currentPlayer()).toBe(PLAYER_INDEX_BOB);
        expect(service.isDebugMode()).toBeTrue();
        expect(service.isLoading()).toBeFalse();
        expect(socketServiceSpy.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.JoinGame, 'remote-game-id');
    });

    it('should preserve newer chat messages when refreshing the same active game', () => {
        const preservedMessages: IMessage[] = [{ author: 'Alice', content: 'Bonjour', postedAt: new Date('2026-01-01T00:00:00.000Z') }];
        service.activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice', 'remote-game-id');
        service.activeGame.messages = preservedMessages;

        const fetchedGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Bob', 'remote-game-id');
        fetchedGame.messages = [];
        gameServiceSpy.getActiveGameById.and.returnValue(of(fetchedGame));

        service.setActiveGame('remote-game-id');

        expect(service.activeGame.messages).toEqual(preservedMessages);
        expect(service.chatMessages()).toEqual(preservedMessages);
    });

    it('should preserve newer chat messages when a socket refresh replaces the same active game', () => {
        const preservedMessages: IMessage[] = [{ author: 'Alice', content: 'Salut', postedAt: new Date('2026-01-01T00:00:00.000Z') }];
        service.activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice', 'remote-game-id');
        service.activeGame.messages = preservedMessages;

        const refreshedGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Bob', 'remote-game-id');
        refreshedGame.messages = [];

        emitEvent<IActiveGame>(SocketEvent.CombatStarted, refreshedGame);

        expect(service.activeGame.messages).toEqual(preservedMessages);
        expect(service.chatMessages()).toEqual(preservedMessages);
    });

    it('should keep only occupied spawn points after a combat refresh', () => {
        const alice = createCharacter('Alice', 0, 0);
        const bob = createCharacter('Bob', 2, 2);
        service.activeGame = createActiveGame([alice, bob], 'Alice', 'remote-game-id');
        service.activeGame.game.board.items = [
            createItem(ItemType.StartingPosition, 0, 0),
            createItem(ItemType.StartingPosition, 1, 1),
            createItem(ItemType.StartingPosition, 2, 2),
            createItem(ItemType.Flag, 0, 1),
        ];

        const refreshedGame = createActiveGame([alice, bob], 'Bob', 'remote-game-id');
        refreshedGame.game.board.items = [
            createItem(ItemType.StartingPosition, 0, 0),
            createItem(ItemType.StartingPosition, 1, 1),
            createItem(ItemType.StartingPosition, 2, 2),
            createItem(ItemType.Flag, 0, 1),
        ];

        emitEvent<CombatOutcome>(SocketEvent.CombatResolved, {
            updatedActiveGame: refreshedGame,
            winner: 'Alice',
            losers: ['Bob'],
            cancelled: false,
        });

        expect(service.activeGame.game.board.items).toEqual([
            createItem(ItemType.StartingPosition, 0, 0),
            createItem(ItemType.StartingPosition, 2, 2),
            createItem(ItemType.Flag, 0, 1),
        ]);
    });

    it('should default current player to index 0 when fetched game currentPlayerIndex is missing', () => {
        const fetchedGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice', 'remote-game-id');
        const fetchedGameWithoutIndex = { ...fetchedGame, currentPlayerIndex: undefined } as unknown as IActiveGame;
        gameServiceSpy.getActiveGameById.and.returnValue(of(fetchedGameWithoutIndex));

        service.setActiveGame('remote-game-id');

        expect(gameServiceSpy.getActiveGameById).toHaveBeenCalledWith('remote-game-id');
        expect(service.currentPlayer()).toBe(0);
    });

    // Edge case: When GameService returns no active game, keep the previous state and clear loading.
    it('should clear loading flag when setActiveGame returns no game', () => {
        const previousGame = service.activeGame;
        gameServiceSpy.getActiveGameById.and.returnValue(of(undefined as unknown as IActiveGame));

        service.setActiveGame('broken-game-id');

        expect(gameServiceSpy.getActiveGameById).toHaveBeenCalledWith('broken-game-id');
        expect(service.activeGame).toBe(previousGame);
        expect(service.isLoading()).toBeFalse();
    });

    it('should ignore game socket events that require an active game when game is missing', () => {
        Object.assign(service as unknown as Record<string, unknown>, { activeGame: undefined });
        const hasChangedBefore = service.hasChangedLocation();

        getEventStream<PlayerMovedResult>(SocketEvent.PlayerMoved).next({
            playerId: 'Alice',
            newPosition: { x: 1, y: 1 },
            movementLeft: 1,
        });
        getEventStream<{ player: string }>(SocketEvent.TurnPreparing).next({ player: 'Alice' });
        getEventStream<{ player: string; movementLeft: number; actionLeft: number }>(SocketEvent.TurnStarted).next({
            player: 'Alice',
            movementLeft: 1,
            actionLeft: 1,
        });
        getEventStream<{ playerId: string }>(SocketEvent.PlayerAbandoned).next({ playerId: 'Alice' });
        getEventStream<{ playerId: string }>(SocketEvent.PlayerKicked).next({ playerId: 'Alice' });
        getEventStream<{ playerId: string }>(SocketEvent.LeftWaitingRoom).next({ playerId: 'Alice' });
        getEventStream<{ winner: string }>(SocketEvent.GameEnded).next({ winner: 'Alice' });

        expect(service.hasChangedLocation()).toBe(hasChangedBefore);
    });

    it('should handle kicked and left waiting room events', () => {
        const alice = createCharacter('Alice');
        const bob = createCharacter('Bob');
        const carol = createCharacter('Carol');
        service.activeGame = createActiveGame([alice, bob, carol], 'Alice');
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(alice);

        getEventStream<{ playerId: string }>(SocketEvent.PlayerKicked).next({ playerId: 'Bob' });
        expect(service.activeGame.players.map((player) => player.name)).toEqual(['Alice', 'Carol']);
        expect(localPlayerServiceSpy.clear).not.toHaveBeenCalled();

        getEventStream<{ playerId: string }>(SocketEvent.LeftWaitingRoom).next({ playerId: 'Ghost' });
        expect(service.activeGame.players.map((player) => player.name)).toEqual(['Alice', 'Carol']);
        getEventStream<{ playerId: string }>(SocketEvent.LeftWaitingRoom).next({ playerId: 'Carol' });
        expect(service.activeGame.players.map((player) => player.name)).toEqual(['Alice']);
    });

    it('should react to game ended and canceled events', () => {
        getEventStream<{ winner: string }>(SocketEvent.GameEnded).next({ winner: 'Alice' });
        expect(service.activeGame.isFinished).toBeTrue();
        expect(service.activeGame.winner).toBe('Alice');

        getEventStream<{ winner: string }>(SocketEvent.GameCanceled).next({ winner: '' });
        expect(localPlayerServiceSpy.clear).toHaveBeenCalled();
        expect(toastServiceSpy.show).toHaveBeenCalledWith("L'organiseur a annulé la partie.");
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should emit move only for reachable tile', () => {
        service.activeGame = createActiveGame([createCharacter('Alice', PLAYER_INDEX_BOB, PLAYER_INDEX_BOB)], 'Alice');
        service.currentPlayer.set(0);
        service.reachableTiles.clear();
        socketServiceSpy.emit.calls.reset();

        service.tryMove(0, PLAYER_INDEX_BOB, MOVE_TOTAL_COLUMNS);
        expect(socketServiceSpy.emit).not.toHaveBeenCalled();

        service.reachableTiles.add(service.getIndex(PLAYER_INDEX_BOB, 2, MOVE_TOTAL_COLUMNS));
        service.tryMove(0, PLAYER_INDEX_BOB, MOVE_TOTAL_COLUMNS);

        expect(socketServiceSpy.emit).toHaveBeenCalledWith(
            Namespaces.Game,
            SocketEvent.PlayerMove,
            jasmine.objectContaining({
                gameId: service.activeGame._id,
                playerId: 'Alice',
                direction: { x: 2, y: PLAYER_INDEX_BOB },
            }),
        );
    });

    it('should emit action only when target is adjacent and different', () => {
        const attacker = createCharacter('Alice', 0, 0);
        const adjacentTarget = createCharacter('Bob', PLAYER_INDEX_BOB, 0);
        const distantTarget = createCharacter('Carol', FAR_POSITION_INDEX, FAR_POSITION_INDEX);

        service.activeGame = createActiveGame([attacker, adjacentTarget, distantTarget], 'Alice');
        service.currentPlayer.set(0);
        service.actionMode.set(true);
        socketServiceSpy.emit.calls.reset();

        service.actionOnPlayer('Alice');
        service.actionOnPlayer('Carol');
        expect(socketServiceSpy.emit).not.toHaveBeenCalled();

        service.actionOnPlayer('Bob');

        expect(socketServiceSpy.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.Action, {
            gameId: service.activeGame._id,
            currentPlayerName: 'Alice',
            targetName: 'Bob',
        });
        expect(service.actionMode()).toBeFalse();
    });

    it('should toggle action mode', () => {
        expect(service.actionMode()).toBeFalse();
        service.toggleActionMode();
        expect(service.actionMode()).toBeTrue();
        service.toggleActionMode();
        expect(service.actionMode()).toBeFalse();
    });

    it('should emit door toggle requests for the current player', () => {
        service.activeGame = createActiveGame([createCharacter('Alice', 1, 1)], 'Alice');
        service.currentPlayer.set(0);
        socketServiceSpy.emit.calls.reset();

        service.toggleDoor(INTERACTION_ROW, INTERACTION_COL);

        expect(socketServiceSpy.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.ToggleDoor, {
            gameId: service.activeGame._id,
            playerId: 'Alice',
            position: { x: INTERACTION_COL, y: INTERACTION_ROW },
        });
    });

    it('should emit sanctuary interaction requests for the current player', () => {
        service.activeGame = createActiveGame([createCharacter('Alice', 1, 1)], 'Alice');
        service.currentPlayer.set(0);
        socketServiceSpy.emit.calls.reset();

        service.interactSanctuary(INTERACTION_ROW, INTERACTION_COL, SanctuaryChoice.Double);

        expect(socketServiceSpy.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.InteractSanctuary, {
            gameId: service.activeGame._id,
            playerId: 'Alice',
            choice: SanctuaryChoice.Double,
            position: { x: INTERACTION_COL, y: INTERACTION_ROW },
        });
    });

    it('should synchronize turn order and index when players are updated', () => {
        const alice = createCharacter('Alice');
        const bob = createCharacter('Bob');
        const carol = createCharacter('Carol');
        service.activeGame = createActiveGame([alice, bob, carol], 'Carol');
        service.activeGame.currentPlayerIndex = 2;
        service.currentPlayer.set(2);

        service.updatePlayers([alice, bob]);

        expect(service.activeGame.turnOrder).toEqual(['Alice', 'Bob']);
        expect(service.activeGame.currentPlayerIndex).toBe(PLAYER_INDEX_BOB);
        expect(service.currentPlayer()).toBe(PLAYER_INDEX_BOB);

        service.updatePlayers([]);

        expect(service.activeGame.turnOrder).toEqual([]);
        expect(service.activeGame.currentPlayerIndex).toBe(0);
        expect(service.currentPlayer()).toBe(0);
    });

    it('should keep current turn index when current player remains in updated turn order', () => {
        const alice = createCharacter('Alice');
        const bob = createCharacter('Bob');
        const carol = createCharacter('Carol');
        service.activeGame = createActiveGame([alice, bob, carol], 'Bob');
        service.activeGame.turnOrder = ['Alice', 'Bob', 'Carol'];
        service.activeGame.currentPlayerIndex = 1;
        service.currentPlayer.set(1);

        service.updatePlayers([alice, bob]);

        expect(service.activeGame.turnOrder).toEqual(['Alice', 'Bob']);
        expect(service.activeGame.currentPlayerIndex).toBe(1);
        expect(service.currentPlayer()).toBe(1);
    });

    it('should do nothing when updating players without an active game', () => {
        Object.assign(service as unknown as Record<string, unknown>, { activeGame: undefined });

        expect(() => service.updatePlayers([createCharacter('Alice')])).not.toThrow();
    });

    it('should fallback to bounded index when current turn player leaves turn order', () => {
        const alice = createCharacter('Alice');
        const bob = createCharacter('Bob');
        const carol = createCharacter('Carol');
        service.activeGame = createActiveGame([alice, bob, carol], 'Carol');
        service.activeGame.turnOrder = ['Alice', 'Bob', 'Carol'];
        service.activeGame.currentPlayerIndex = 2;
        service.currentPlayer.set(2);

        service.updatePlayers([alice, bob]);

        expect(service.activeGame.turnOrder).toEqual(['Alice', 'Bob']);
        expect(service.activeGame.currentPlayerIndex).toBe(1);
        expect(service.currentPlayer()).toBe(1);
    });

    it('should guard private turn-order sync when activeGame is missing', () => {
        Object.assign(service as unknown as Record<string, unknown>, { activeGame: undefined });

        expect(() => (service as unknown as { syncTurnOrderWithPlayers: () => void }).syncTurnOrderWithPlayers()).not.toThrow();
    });

    it('should compute reachable tiles based on movement range', () => {
        service.activeGame = createActiveGame([createCharacter('Alice', 0, 0, PLAYER_INDEX_BOB)], 'Alice');
        service.currentPlayer.set(0);

        const graph: [number, number][][] = [
            [
                [PLAYER_INDEX_BOB, PLAYER_INDEX_BOB],
                [2, PLAYER_INDEX_BOB],
            ],
            [
                [0, PLAYER_INDEX_BOB],
                [LAST_GRAPH_NODE_INDEX, PLAYER_INDEX_BOB],
            ],
            [
                [0, PLAYER_INDEX_BOB],
                [LAST_GRAPH_NODE_INDEX, PLAYER_INDEX_BOB],
            ],
            [
                [PLAYER_INDEX_BOB, PLAYER_INDEX_BOB],
                [2, PLAYER_INDEX_BOB],
            ],
        ];

        const previousReachableTiles = service.reachableTiles;
        service.updateMovementRange(2, graph);

        expect(service.reachableTiles).not.toBe(previousReachableTiles);
        expect([...service.reachableTiles].sort((a, b) => a - b)).toEqual([0, PLAYER_INDEX_BOB, 2]);
    });

    // Edge case: When movement or attack preconditions fail, the service should guard and avoid emitting invalid actions.
    it('should guard movement, movement range, attack and teleport edge cases', () => {
        service.reachableTiles = new Set([UNKNOWN_TILE_INDEX]);
        service.updateMovementRange(0, []);
        expect([...service.reachableTiles]).toEqual([UNKNOWN_TILE_INDEX]);

        spyOn(service, 'getCurrentPlayer').and.returnValue(undefined);
        service.updateMovementRange(2, [[[]] as unknown as [number, number][]]);
        service.tryMove(PLAYER_INDEX_BOB, 0, MOVE_TOTAL_COLUMNS);
        service.actionOnPlayer('Alice');
        service.toggleDoor(TELEPORT_ROW, TELEPORT_COL);
        service.debugTeleport(TELEPORT_ROW, TELEPORT_COL);
        expect(socketServiceSpy.emit).not.toHaveBeenCalled();

        (service.getCurrentPlayer as jasmine.Spy).and.returnValue(createCharacter('Alice'));
        service.actionOnPlayer('Ghost');
        expect(socketServiceSpy.emit).not.toHaveBeenCalled();

        service.debugTeleport(TELEPORT_ROW, TELEPORT_COL);
        expect(socketServiceSpy.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.DebugTeleport, {
            gameId: service.activeGame._id,
            playerName: 'Alice',
            target: { x: TELEPORT_COL, y: TELEPORT_ROW },
        });
    });

    it('should remove kicked local player and redirect to home', () => {
        const alice = createCharacter('Alice');
        const bob = createCharacter('Bob');
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(alice);
        service.activeGame = createActiveGame([alice, bob], 'Alice');

        getEventStream<{ playerId: string }>(SocketEvent.PlayerKicked).next({ playerId: 'Alice' });

        expect(service.activeGame.players.map((player) => player.name)).toEqual(['Bob']);
        expect(localPlayerServiceSpy.clear).toHaveBeenCalled();
        expect(toastServiceSpy.show).toHaveBeenCalledWith('Vous avez été expulsé de la partie');
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });

    it('should emit socket wrappers for kick, leave waiting room and abandon', () => {
        service.kickPlayer('Bob');
        service.leaveWaitingRoom('Bob');
        service.abandonGame('Alice');

        expect(socketServiceSpy.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.PlayerKick, {
            gameId: service.activeGame._id,
            playerId: 'Bob',
        });
        expect(socketServiceSpy.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.LeaveWaitingRoom, {
            gameId: service.activeGame._id,
            playerId: 'Bob',
        });
        expect(socketServiceSpy.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.PlayerAbandon, {
            gameId: service.activeGame._id,
            playerId: 'Alice',
        });
    });

    it('should send unload request and cleanup every subscription', () => {
        const fetchSpy = spyOn(window, 'fetch').and.returnValue(Promise.resolve({ ok: true } as Response));
        service.leaveActiveGameOnUnload('Alice', 'active-game-1');
        expect(fetchSpy).toHaveBeenCalledWith(
            `${environment.apiUrl}/activeGame/leave`,
            jasmine.objectContaining({ method: 'PATCH', keepalive: true }),
        );

        Object.assign(service as unknown as Record<string, unknown>, {
            socketSubscriptions: [
                createUnsubscribeSpy(),
                createUnsubscribeSpy(),
                createUnsubscribeSpy(),
                createUnsubscribeSpy(),
                createUnsubscribeSpy(),
                createUnsubscribeSpy(),
                createUnsubscribeSpy(),
                createUnsubscribeSpy(),
            ],
            setActiveGameSubscription: createUnsubscribeSpy(),
        });

        service.ngOnDestroy();

        const subscriptions = service as unknown as Record<string, { unsubscribe?: jasmine.Spy } | { unsubscribe?: jasmine.Spy }[]>;
        for (const subscription of subscriptions.socketSubscriptions as { unsubscribe?: jasmine.Spy }[]) {
            expect(subscription.unsubscribe).toHaveBeenCalled();
        }
        expect((subscriptions.setActiveGameSubscription as { unsubscribe?: jasmine.Spy }).unsubscribe).toHaveBeenCalled();
    });

    it('should keep non-starting items and only remove unused spawn points', () => {
        const alice = createCharacter('Alice', 0, 0);
        service.activeGame = createActiveGame([alice], 'Alice');
        service.activeGame.game.board.items = [
            createItem(ItemType.StartingPosition, 0, 0),
            createItem(ItemType.StartingPosition, PLAYER_INDEX_BOB, PLAYER_INDEX_BOB),
            createItem(ItemType.Flag, 0, PLAYER_INDEX_BOB),
        ];

        service.removeUnusedSpawnPoints();

        expect(service.activeGame.game.board.items).toEqual([
            createItem(ItemType.StartingPosition, 0, 0),
            createItem(ItemType.Flag, 0, PLAYER_INDEX_BOB),
        ]);
    });

    it('should keep board items unchanged when turn order is empty', () => {
        service.activeGame = createActiveGame([createCharacter('Alice')], 'Alice');
        service.activeGame.turnOrder = [];
        const itemsBefore = [createItem(ItemType.StartingPosition, 0, 0), createItem(ItemType.Flag, 0, 1)];
        service.activeGame.game.board.items = itemsBefore;

        service.removeUnusedSpawnPoints();

        expect(service.activeGame.game.board.items).toEqual(itemsBefore);
    });
    function createActiveGame(players: ICharacter[], currentPlayerName?: string, id = 'active-game-1'): IActiveGame {
        const turnOrder = players.map((player) => player.name);
        const selectedPlayerName = currentPlayerName ?? turnOrder[0] ?? '';
        const currentPlayerIndex = Math.max(turnOrder.indexOf(selectedPlayerName), 0);

        const game: IGame = {
            gameTitle: 'Arena',
            description: '',
            gameMode: GameType.Classic,
            dateCreated: new Date('2026-01-01T00:00:00.000Z'),
            lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
            visibility: Visibility.Hidden,
            board: {
                cells: [
                    [CellType.Empty, CellType.Empty],
                    [CellType.Empty, CellType.Empty],
                ],
                items: [],
            },
        };

        return {
            _id: id,
            game,
            players,
            currentPlayerIndex,
            turnOrder,
            isFinished: false,
            winner: null,
            messages: [],
            isDebugMode: false,
            organizerName: 'Organizer',
            maxPlayerCount: MAX_PLAYER_COUNT,
            turnIsInPreparation: false,
            hasFlagId: '',

            turnStartTimeStamp: 0,
            currentAttack: null,
        };
    }

    function createCharacter(name: string, x = 0, y = 0, movementLeft = DEFAULT_MOVEMENT_LEFT): ICharacter {
        return {
            name,
            avatar: Avatar.Avatar1,
            initialHealth: 10,
            currentHealth: 10,
            attackBonusDiceType: DiceType.FourSided,
            defenseBonusDiceType: DiceType.SixSided,
            rapidityPoints: 4,
            attackPoints: 4,
            defensePoints: 4,
            actionsLeft: 1,
            movementLeft,
            victories: 0,
            hasAbandoned: false,
            startingPosition: { x, y },
            currentPosition: { x, y },

            nCombats: 0,
            nVictories: 0,
            nDefeats: 0,
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            visitedCells: [],
        };
    }

    function createItem(itemType: ItemType, x: number, y: number): IItem {
        return {
            itemType,
            x,
            y,
            size: itemType === ItemType.StartingPosition || itemType === ItemType.Flag ? 1 : SANCTUARY_ITEM_SIZE,
        };
    }

    function createUnsubscribeSpy(): { unsubscribe: jasmine.Spy } {
        return { unsubscribe: jasmine.createSpy('unsubscribe') };
    }
});
