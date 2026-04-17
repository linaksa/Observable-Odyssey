/* eslint-disable @typescript-eslint/no-magic-numbers -- To make the spec file easier to read */
/* eslint-disable max-lines -- This spec covers multiple interaction branches and edge cases in one suite. */
/**
 * Testing strategy — Game Turn Service
 *
 * Approach:
 * - Feed deterministic socket-event streams to validate turn/combat state transitions and countdown behavior.
 * - Use signal-backed active-game stubs to assert player-index synchronization, action-mode resets, and debug guards.
 * - Verify command-style side effects (`endTurn`, lifecycle destroy) through explicit namespace/event emissions and teardown checks.
 *
 * Edge cases covered:
 * - Missing players, empty turn orders, or unknown incoming players keep current-turn resolution safe.
 * - End-turn emission is blocked when prerequisites (local player, game id, non-combat state) are not met.
 * - After `destroy`, subsequent socket events no longer mutate service state.
 */
import { signal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame, ICurrentAttack } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, COMBAT_TIME_MS, DiceType, MILLISECONDS_PER_SECOND, TURN_PREPARATION_TIME_MS, TURN_TIME_MS } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Subject } from 'rxjs';

describe('GameTurnService', () => {
    let service: GameTurnService;
    let socketServiceSpy: jasmine.SpyObj<SocketService>;
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let activeGameServiceStub: {
        activeGame: IActiveGame;
        isDebugMode: jasmine.Spy<() => boolean>;
        currentPlayer: ReturnType<typeof signal<number>>;
        hasChangedLocation: ReturnType<typeof signal<boolean>>;
        actionMode?: ReturnType<typeof signal<boolean>>;
        getPlayerByName: jasmine.Spy<(playerName: string) => ICharacter | undefined>;
    };

    const eventStreams = new Map<string, Subject<unknown>>();

    const getEventStream = <T>(event: string): Subject<T> => {
        if (!eventStreams.has(event)) {
            eventStreams.set(event, new Subject<unknown>());
        }
        return eventStreams.get(event) as Subject<T>;
    };

    beforeEach(() => {
        socketServiceSpy = jasmine.createSpyObj<SocketService>('SocketService', ['on', 'emit']);
        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer']);
        activeGameServiceStub = {
            activeGame: createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice'),
            isDebugMode: jasmine.createSpy('isDebugMode').and.returnValue(false),
            currentPlayer: signal(0),
            hasChangedLocation: signal(false),
            actionMode: signal(false),
            getPlayerByName: jasmine
                .createSpy('getPlayerByName')
                .and.callFake((playerName: string) => activeGameServiceStub.activeGame.players.find((player) => player.name === playerName)),
        };

        eventStreams.clear();
        socketServiceSpy.on.and.callFake(<T>(_namespace: string, event: string) => getEventStream<T>(event).asObservable());
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Alice'));

        TestBed.configureTestingModule({
            providers: [
                GameTurnService,
                { provide: SocketService, useValue: socketServiceSpy },
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
            ],
        });

        service = TestBed.inject(GameTurnService);
    });

    // Edge case: When no turn event happened, resolve current player name from active game.
    it('should resolve current player name from active game when no turn event happened', () => {
        activeGameServiceStub.activeGame.currentPlayerIndex = 1;

        expect(service.currentPlayerName).toBe('Bob');
    });

    // Edge case: When active game has no players, return null current player.
    it('should return null current player when active game has no players', () => {
        activeGameServiceStub.activeGame = {
            ...activeGameServiceStub.activeGame,
            players: [],
            turnOrder: [],
            currentPlayerIndex: 0,
        };

        expect(service.currentPlayerName).toBeNull();
    });

    // Edge case: When turn order index is out of range, return null current player.
    it('should return null current player when turn order index is out of range', () => {
        activeGameServiceStub.activeGame = {
            ...activeGameServiceStub.activeGame,
            players: [createCharacter('Alice')],
            turnOrder: [],
            currentPlayerIndex: 5,
        };

        expect(service.currentPlayerName).toBeNull();
    });

    it('should update preparing and started turn state from socket events', () => {
        service.initializeTurnListeners();

        getEventStream<{ player: string }>(SocketEvent.TurnPreparing).next({ player: 'Bob' });

        expect(service.currentPlayerName).toBe('Bob');
        expect(service.isTurnPreparing()).toBeTrue();
        expect(service.turnTimeLeftSeconds()).toBe(Math.ceil(TURN_PREPARATION_TIME_MS / MILLISECONDS_PER_SECOND));

        getEventStream<{ player: string; movementLeft: number; actionLeft: number }>(SocketEvent.TurnStarted).next({
            player: 'Alice',
            movementLeft: 4,
            actionLeft: 1,
        });

        expect(service.currentPlayerName).toBe('Alice');
        expect(service.isTurnPreparing()).toBeFalse();
        expect(service.turnTimeLeftSeconds()).toBe(Math.ceil(TURN_TIME_MS / MILLISECONDS_PER_SECOND));
    });

    it('should freeze the turn countdown and start combat countdown when combat begins', fakeAsync(() => {
        service.turnTimeLeftSeconds.set(5);
        service.initializeTurnListeners();

        getEventStream<IActiveGame>(SocketEvent.CombatStarted).next({
            ...activeGameServiceStub.activeGame,
            currentAttack: createAttack('Alice', 'Bob', 3),
        });

        const combatStartSeconds = Math.ceil(COMBAT_TIME_MS / MILLISECONDS_PER_SECOND);

        expect(service.isCombatActive()).toBeTrue();
        expect(service.combatTimeLeftSeconds()).toBe(combatStartSeconds);

        tick(COMBAT_TIME_MS + MILLISECONDS_PER_SECOND);

        expect(service.turnTimeLeftSeconds()).toBe(5);
        expect(service.combatTimeLeftSeconds()).toBeNull();
        expect(service.canEndTurn).toBeFalse();
        service.destroy();
    }));

    it('should reset action mode when combat starts', () => {
        // Set action mode to true before starting combat
        (activeGameServiceStub.actionMode as ReturnType<typeof signal<boolean>>).set(true);

        service.initializeTurnListeners();

        // Verify action mode is initially true
        expect((activeGameServiceStub.actionMode as ReturnType<typeof signal<boolean>>)()).toBeTrue();

        // Combat starts
        getEventStream<IActiveGame>(SocketEvent.CombatStarted).next({
            ...activeGameServiceStub.activeGame,
            currentAttack: createAttack('Alice', 'Bob', 3),
        });

        // Action mode should be reset to false
        expect((activeGameServiceStub.actionMode as ReturnType<typeof signal<boolean>>)()).toBeFalse();
    });

    it('should clear the combat countdown when combat resolves', fakeAsync(() => {
        service.initializeTurnListeners();

        getEventStream<IActiveGame>(SocketEvent.CombatStarted).next({
            ...activeGameServiceStub.activeGame,
            currentAttack: createAttack('Alice', 'Bob', 2),
        });

        getEventStream<IActiveGame>(SocketEvent.CombatResolved).next({
            ...activeGameServiceStub.activeGame,
            currentAttack: null,
        });

        expect(service.isCombatActive()).toBeFalse();
        expect(service.combatTimeLeftSeconds()).toBeNull();
        service.destroy();
    }));

    it('should ignore turn sync when active game has no turn order', () => {
        activeGameServiceStub.activeGame = {
            ...activeGameServiceStub.activeGame,
            turnOrder: [],
            players: [],
            currentPlayerIndex: 0,
        };
        activeGameServiceStub.currentPlayer.set(0);
        activeGameServiceStub.hasChangedLocation.set(false);

        service.initializeTurnListeners();
        getEventStream<{ player: string }>(SocketEvent.TurnPreparing).next({ player: 'Alice' });

        expect(activeGameServiceStub.currentPlayer()).toBe(0);
        expect(activeGameServiceStub.hasChangedLocation()).toBeFalse();
    });

    it('should ignore turn sync when incoming player is not in turn order', () => {
        activeGameServiceStub.activeGame.turnOrder = ['Alice'];
        activeGameServiceStub.activeGame.currentPlayerIndex = 0;
        activeGameServiceStub.currentPlayer.set(0);
        activeGameServiceStub.hasChangedLocation.set(false);

        service.initializeTurnListeners();
        getEventStream<{ player: string; movementLeft: number; actionLeft: number }>(SocketEvent.TurnStarted).next({
            player: 'Ghost',
            movementLeft: 3,
            actionLeft: 1,
        });

        expect(activeGameServiceStub.currentPlayer()).toBe(0);
        expect(activeGameServiceStub.hasChangedLocation()).toBeFalse();
    });

    it('should deny ending turn while preparing', () => {
        service.initializeTurnListeners();
        getEventStream<{ player: string }>(SocketEvent.TurnPreparing).next({ player: 'Alice' });

        expect(service.canEndTurn).toBeFalse();
    });

    it('should deny ending turn during combat even in debug mode', () => {
        activeGameServiceStub.isDebugMode.and.returnValue(true);
        activeGameServiceStub.activeGame.organizerName = 'Organizer';
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Organizer'));
        activeGameServiceStub.activeGame.currentAttack = createAttack('Alice', 'Bob', 3);
        service.initializeTurnListeners();

        getEventStream<{ player: string; movementLeft: number; actionLeft: number }>(SocketEvent.TurnStarted).next({
            player: 'Bob',
            movementLeft: 4,
            actionLeft: 1,
        });

        // Combat is already present, so even debug mode cannot end the turn
        expect(service.canEndTurn).toBeFalse();

        // Combat starts
        getEventStream<IActiveGame>(SocketEvent.CombatStarted).next({
            ...activeGameServiceStub.activeGame,
            currentAttack: createAttack('Alice', 'Bob', 3),
        });

        // Now even the organizer in debug mode cannot end turn
        expect(service.canEndTurn).toBeFalse();
    });

    it('should emit end-turn event when local player can end turn', () => {
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Alice'));

        service.endTurn();

        expect(socketServiceSpy.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.EndTurn, activeGameServiceStub.activeGame._id);
    });

    // Edge case: When local player cannot end turn, it should not emit end-turn event.
    it('should not emit end-turn event when local player cannot end turn', () => {
        socketServiceSpy.emit.calls.reset();
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);

        service.endTurn();

        expect(socketServiceSpy.emit).not.toHaveBeenCalled();
    });

    // Edge case: When active game id is missing, it should not emit end-turn event.
    it('should not emit end-turn event when active game id is missing', () => {
        socketServiceSpy.emit.calls.reset();
        activeGameServiceStub.activeGame = {
            ...activeGameServiceStub.activeGame,
            _id: '',
        };

        service.endTurn();

        expect(socketServiceSpy.emit).not.toHaveBeenCalled();
    });

    it('should stop countdown automatically when remaining time reaches zero', fakeAsync(() => {
        service.initializeTurnListeners();

        getEventStream<{ player: string }>(SocketEvent.TurnPreparing).next({ player: 'Alice' });
        expect(service.turnTimeLeftSeconds()).toBe(Math.ceil(TURN_PREPARATION_TIME_MS / MILLISECONDS_PER_SECOND));

        tick(TURN_PREPARATION_TIME_MS + MILLISECONDS_PER_SECOND);

        expect(service.turnTimeLeftSeconds()).toBe(0);
    }));

    // Edge case: When listeners are destroyed, subsequent socket events should no longer mutate turn state.
    it('should ignore socket events after destroy', () => {
        service.initializeTurnListeners();
        getEventStream<{ player: string; movementLeft: number; actionLeft: number }>(SocketEvent.TurnStarted).next({
            player: 'Bob',
            movementLeft: 4,
            actionLeft: 1,
        });

        service.destroy();
        getEventStream<{ player: string; movementLeft: number; actionLeft: number }>(SocketEvent.TurnStarted).next({
            player: 'Alice',
            movementLeft: 4,
            actionLeft: 1,
        });

        expect(service.currentPlayerName).toBe('Bob');
    });

    it('should reset action mode when a new turn starts', () => {
        (activeGameServiceStub.actionMode as ReturnType<typeof signal<boolean>>).set(true);

        service.initializeTurnListeners();

        expect((activeGameServiceStub.actionMode as ReturnType<typeof signal<boolean>>)()).toBeTrue();

        getEventStream<{ player: string; movementLeft: number; actionLeft: number }>(SocketEvent.TurnStarted).next({
            player: 'Bob',
            movementLeft: 4,
            actionLeft: 1,
        });

        expect((activeGameServiceStub.actionMode as ReturnType<typeof signal<boolean>>)()).toBeFalse();
    });

    it('should use provided turn timeLeft when turn starts', () => {
        service.initializeTurnListeners();

        getEventStream<{ player: string; movementLeft: number; actionLeft: number; timeLeft: number }>(SocketEvent.TurnStarted).next({
            player: 'Alice',
            movementLeft: 4,
            actionLeft: 1,
            timeLeft: 2500,
        });

        expect(service.turnTimeLeftSeconds()).toBe(Math.ceil(2500 / MILLISECONDS_PER_SECOND));
    });

    it('should allow organizer to end turn in debug mode when not preparing and not in combat', () => {
        activeGameServiceStub.isDebugMode.and.returnValue(true);
        activeGameServiceStub.activeGame.organizerName = 'Organizer';
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Organizer'));
        service.initializeTurnListeners();

        getEventStream<{ player: string; movementLeft: number; actionLeft: number }>(SocketEvent.TurnStarted).next({
            player: 'Alice',
            movementLeft: 4,
            actionLeft: 1,
        });

        expect(service.canEndTurn).toBeTrue();
    });

    it('should initialize listeners only once', () => {
        service.initializeTurnListeners();
        const firstRegistrationCount = socketServiceSpy.on.calls.count();

        service.initializeTurnListeners();

        expect(socketServiceSpy.on.calls.count()).toBe(firstRegistrationCount);
    });

    it('should ignore combat start and combat turn start events without current attack', () => {
        service.initializeTurnListeners();
        (activeGameServiceStub.actionMode as ReturnType<typeof signal<boolean>>).set(true);

        getEventStream<IActiveGame>(SocketEvent.CombatStarted).next({
            ...activeGameServiceStub.activeGame,
            currentAttack: null,
        });
        getEventStream<IActiveGame>(SocketEvent.CombatTurnStart).next({
            ...activeGameServiceStub.activeGame,
            currentAttack: null,
        });

        expect(service.isCombatActive()).toBeFalse();
        expect((activeGameServiceStub.actionMode as ReturnType<typeof signal<boolean>>)()).toBeTrue();
        expect(service.combatTimeLeftSeconds()).toBeNull();
    });

    it('should stop combat countdown when combat turn is applied', () => {
        service.initializeTurnListeners();
        getEventStream<IActiveGame>(SocketEvent.CombatStarted).next({
            ...activeGameServiceStub.activeGame,
            currentAttack: createAttack('Alice', 'Bob', 2),
        });

        expect(service.combatTimeLeftSeconds()).not.toBeNull();

        getEventStream<{ updatedActiveGame: IActiveGame }>(SocketEvent.CombatTurnApplied).next({
            updatedActiveGame: activeGameServiceStub.activeGame,
        });

        expect(service.combatTimeLeftSeconds()).toBeNull();
    });

    it('should start combat countdown when a combat turn starts with an active attack', () => {
        // This verifies the explicit CombatTurnStart branch with a valid current attack.
        service.initializeTurnListeners();

        getEventStream<IActiveGame>(SocketEvent.CombatTurnStart).next({
            ...activeGameServiceStub.activeGame,
            currentAttack: createAttack('Alice', 'Bob', 2),
        });

        expect(service.isCombatActive()).toBeTrue();
        expect(service.combatTimeLeftSeconds()).toBe(Math.ceil(COMBAT_TIME_MS / MILLISECONDS_PER_SECOND));
    });

    it('should delegate ngOnDestroy to destroy', () => {
        const destroySpy = spyOn(service, 'destroy').and.callThrough();

        service.ngOnDestroy();

        expect(destroySpy).toHaveBeenCalled();
    });
});

function createActiveGame(players: ICharacter[], currentPlayer: string): IActiveGame {
    const game: IGame = {
        gameTitle: 'Arena',
        description: '',
        gameMode: GameType.Classic,
        dateCreated: new Date('2026-01-01T00:00:00.000Z'),
        lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
        visibility: Visibility.Hidden,
        board: {
            cells: [[CellType.Empty]],
            items: [],
        },
    };

    return {
        _id: 'active-game-1',
        game,
        players,
        currentPlayerIndex: players.findIndex((player) => player.name === currentPlayer),
        turnOrder: players.map((player) => player.name),
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Organizer',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: '',

        turnStartTimeStamp: 0,
        currentAttack: null,
    };
}

function createCharacter(name: string): ICharacter {
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
        movementLeft: 4,
        victories: 0,
        hasAbandoned: false,
        startingPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },

        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}

function createAttack(attacker: string, defender: string, suspendedTurnTimer: number): ICurrentAttack {
    return {
        attacker,
        defender,
        attackerPosture: null,
        defenderPosture: null,
        turnCount: 1,
        suspendedTurnTimer,
    };
}
