/**
 * Testing strategy — Game Turn Service
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
import { signal } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/active-game.service';
import { LocalPlayerService } from '@app/services/local-player.service';
import { SocketService } from '@app/services/socket.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType, MILLISECONDS_PER_SECOND, TEMPS_PREPA_TOUR, TEMPS_TOUR } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Subject } from 'rxjs';
import { GameTurnService } from './game-turn.service';

describe('GameTurnService', () => {
    let service: GameTurnService;
    let socketServiceSpy: jasmine.SpyObj<SocketService>;
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let activeGameServiceStub: {
        activeGame: IActiveGame;
        isDebugMode: jasmine.Spy<() => boolean>;
        currentPlayer: ReturnType<typeof signal<number>>;
        hasChangedLocation: ReturnType<typeof signal<boolean>>;
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

    // Edge case: should resolve current player name from active game when no turn event happened.
    it('should resolve current player name from active game when no turn event happened', () => {
        activeGameServiceStub.activeGame.currentPlayerIndex = 1;

        expect(service.currentPlayerName).toBe('Bob');
    });

    // Edge case: should return null current player when active game has no players.
    it('should return null current player when active game has no players', () => {
        activeGameServiceStub.activeGame = {
            ...activeGameServiceStub.activeGame,
            players: [],
            turnOrder: [],
            currentPlayerIndex: 0,
        };

        expect(service.currentPlayerName).toBeNull();
    });

    // Edge case: should return null current player when turn order index is out of range.
    it('should return null current player when turn order index is out of range', () => {
        activeGameServiceStub.activeGame = {
            ...activeGameServiceStub.activeGame,
            players: [createCharacter('Alice')],
            turnOrder: [],
            currentPlayerIndex: 5,
        };

        expect(service.currentPlayerName).toBeNull();
    });

    it('should register turn listeners only once', () => {
        service.initializeTurnListeners();
        service.initializeTurnListeners();

        expect(socketServiceSpy.on).toHaveBeenCalledTimes(2);
    });

    it('should update preparing and started turn state from socket events', () => {
        service.initializeTurnListeners();

        getEventStream<{ player: string }>(SocketEvent.TurnPreparing).next({ player: 'Bob' });

        expect(service.currentPlayerName).toBe('Bob');
        expect(service.isTurnPreparing).toBeTrue();
        expect(service.turnTimeLeftSeconds).toBe(Math.ceil(TEMPS_PREPA_TOUR / MILLISECONDS_PER_SECOND));

        getEventStream<{ player: string; movementLeft: number; actionLeft: number }>(SocketEvent.TurnStarted).next({
            player: 'Alice',
            movementLeft: 4,
            actionLeft: 1,
        });

        expect(service.currentPlayerName).toBe('Alice');
        expect(service.isTurnPreparing).toBeFalse();
        expect(service.turnTimeLeftSeconds).toBe(Math.ceil(TEMPS_TOUR / MILLISECONDS_PER_SECOND));
    });

    it('should deny ending turn while preparing', () => {
        service.initializeTurnListeners();
        getEventStream<{ player: string }>(SocketEvent.TurnPreparing).next({ player: 'Alice' });

        expect(service.canEndTurn).toBeFalse();
    });

    it('should allow organizer to end turn in debug mode', () => {
        activeGameServiceStub.isDebugMode.and.returnValue(true);
        activeGameServiceStub.activeGame.organizerName = 'Organizer';
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Organizer'));
        service.initializeTurnListeners();

        getEventStream<{ player: string; movementLeft: number; actionLeft: number }>(SocketEvent.TurnStarted).next({
            player: 'Bob',
            movementLeft: 4,
            actionLeft: 1,
        });

        expect(service.canEndTurn).toBeTrue();
    });

    it('should emit end-turn event when local player can end turn', () => {
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Alice'));

        service.endTurn();

        expect(socketServiceSpy.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.EndTurn, activeGameServiceStub.activeGame._id);
    });

    // Edge case: should not emit end-turn event when local player cannot end turn.
    it('should not emit end-turn event when local player cannot end turn', () => {
        socketServiceSpy.emit.calls.reset();
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);

        service.endTurn();

        expect(socketServiceSpy.emit).not.toHaveBeenCalled();
    });

    // Edge case: should not emit end-turn event when active game id is missing.
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
        expect(service.turnTimeLeftSeconds).toBe(Math.ceil(TEMPS_PREPA_TOUR / MILLISECONDS_PER_SECOND));

        tick(TEMPS_PREPA_TOUR + MILLISECONDS_PER_SECOND);

        expect(service.turnTimeLeftSeconds).toBe(0);
    }));

    // Edge case: should ignore socket events after destroy.
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
});

function createActiveGame(players: ICharacter[], currentPlayer: string): IActiveGame {
    const game: IGame = {
        gameTitle: 'Arena',
        description: '',
        gameMode: GameType.Classic,
        dateCreated: new Date('2026-01-01T00:00:00.000Z'),
        lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
        visibility: Visibility.Hidden,
        preview: '' as Base64URLString,
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
        positionDepart: { x: 0, y: 0 },
        positionGrille: { x: 0, y: 0 },
    };
}
