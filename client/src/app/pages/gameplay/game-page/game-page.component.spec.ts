/**
 * Testing strategy — GamePageComponent
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
import { Component } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { DebugSocketService } from '@app/services/realtime/debug.socket.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Subject } from 'rxjs';
import { GamePageComponent } from './game-page.component';

const TURN_STATUS_SECONDS = 8;

describe('GamePageComponent', () => {
    let component: GamePageComponent;
    let fixture: ComponentFixture<GamePageComponent>;

    let routeParams$: Subject<{ activeGameId?: string }>;
    let playersUpdated$: Subject<ICharacter[]>;

    let activeGameServiceSpy: ActiveGameServiceSpy;
    let socketServiceSpy: jasmine.SpyObj<SocketService>;
    let debugSocketServiceSpy: jasmine.SpyObj<DebugSocketService>;
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let gameTurnServiceMock: GameTurnServiceMock;

    beforeEach(async () => {
        routeParams$ = new Subject<{ activeGameId?: string }>();
        playersUpdated$ = new Subject<ICharacter[]>();

        activeGameServiceSpy = jasmine.createSpyObj<Pick<ActiveGameService, 'setActiveGame' | 'updatePlayers'>>('ActiveGameService', [
            'setActiveGame',
            'updatePlayers',
        ]) as ActiveGameServiceSpy;
        activeGameServiceSpy.activeGame = createActiveGame('existing-active-game');

        socketServiceSpy = jasmine.createSpyObj<SocketService>('SocketService', ['connect', 'on', 'emit']);
        socketServiceSpy.on.and.returnValue(playersUpdated$.asObservable());

        debugSocketServiceSpy = jasmine.createSpyObj<DebugSocketService>('DebugSocketService', ['connect', 'emitDebugModeToggle']);
        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer']);
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Alice'));

        gameTurnServiceMock = {
            initializeTurnListeners: jasmine.createSpy('initializeTurnListeners'),
            destroy: jasmine.createSpy('destroy'),
            endTurn: jasmine.createSpy('endTurn'),
            currentPlayerName: 'Alice',
            turnTimeLeftSeconds: 24,
            isTurnPreparing: false,
            canEndTurn: true,
        };

        const overrideInfo: MetadataOverride<Component> = {
            set: {
                template: '',
                imports: [],
                providers: [{ provide: GameTurnService, useValue: gameTurnServiceMock }],
            },
        };
        TestBed.overrideComponent(GamePageComponent, overrideInfo);

        await TestBed.configureTestingModule({
            imports: [GamePageComponent],
            providers: [
                { provide: ActivatedRoute, useValue: { params: routeParams$.asObservable() } },
                { provide: ActiveGameService, useValue: activeGameServiceSpy },
                { provide: SocketService, useValue: socketServiceSpy },
                { provide: DebugSocketService, useValue: debugSocketServiceSpy },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GamePageComponent);
        component = fixture.componentInstance;
    });

    it('should initialize game subscriptions and emit join payload from route activeGameId', () => {
        component.ngOnInit();
        routeParams$.next({ activeGameId: 'active-game-1' });

        const updatedPlayers = [createCharacter('Bob')];
        playersUpdated$.next(updatedPlayers);

        expect(debugSocketServiceSpy.connect).toHaveBeenCalled();
        expect(activeGameServiceSpy.setActiveGame).toHaveBeenCalledWith('active-game-1');
        expect(socketServiceSpy.connect).toHaveBeenCalledWith(Namespaces.Game);
        expect(socketServiceSpy.on).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.PlayersUpdated);
        expect(gameTurnServiceMock.initializeTurnListeners).toHaveBeenCalledTimes(1);
        expect(activeGameServiceSpy.updatePlayers).toHaveBeenCalledWith(updatedPlayers);
        expect(socketServiceSpy.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.JoinGame, {
            activeGameId: 'active-game-1',
            playerName: 'Alice',
        });
    });

    // Edge case: When no route id and no fallback active game id exist, skip setup.
    it('should skip setup when no route id and no fallback active game id exist', () => {
        activeGameServiceSpy.activeGame = createActiveGame('');
        component.ngOnInit();

        routeParams$.next({});

        expect(activeGameServiceSpy.setActiveGame).not.toHaveBeenCalled();
        expect(socketServiceSpy.connect).not.toHaveBeenCalledWith(Namespaces.Game);
        expect(gameTurnServiceMock.initializeTurnListeners).not.toHaveBeenCalled();
        expect(socketServiceSpy.emit).not.toHaveBeenCalled();
    });

    it('should fallback to current active game id when route id is missing', () => {
        activeGameServiceSpy.activeGame = createActiveGame('fallback-game-id');
        component.ngOnInit();

        routeParams$.next({});

        expect(activeGameServiceSpy.setActiveGame).toHaveBeenCalledWith('fallback-game-id');
        expect(socketServiceSpy.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.JoinGame, {
            activeGameId: 'fallback-game-id',
            playerName: 'Alice',
        });
    });

    it('should reuse existing players subscription on subsequent route updates', () => {
        component.ngOnInit();

        routeParams$.next({ activeGameId: 'active-game-1' });
        routeParams$.next({ activeGameId: 'active-game-2' });

        expect(activeGameServiceSpy.setActiveGame).toHaveBeenCalledTimes(2);
        expect(socketServiceSpy.connect).toHaveBeenCalledTimes(1);
        expect(socketServiceSpy.on).toHaveBeenCalledTimes(1);
        expect(gameTurnServiceMock.initializeTurnListeners).toHaveBeenCalledTimes(1);
        expect(socketServiceSpy.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.JoinGame, {
            activeGameId: 'active-game-2',
            playerName: 'Alice',
        });
    });

    it('should ignore debug shortcut when user is typing in chat input', () => {
        const event = createKeyboardEvent('m', true);

        component.handleKeyDown(event);

        expect(debugSocketServiceSpy.emitDebugModeToggle).not.toHaveBeenCalled();
    });

    it('should emit debug toggle on m key and ignore other keys', () => {
        component.handleKeyDown(createKeyboardEvent('x'));
        expect(debugSocketServiceSpy.emitDebugModeToggle).not.toHaveBeenCalled();

        component.handleKeyDown(createKeyboardEvent('m'));
        expect(debugSocketServiceSpy.emitDebugModeToggle).toHaveBeenCalledWith('Alice', 'existing-active-game');
    });

    it('should use empty fallback values when m key is pressed without local player or active game', () => {
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);
        activeGameServiceSpy.activeGame = undefined as unknown as IActiveGame;

        component.handleKeyDown(createKeyboardEvent('m'));

        expect(debugSocketServiceSpy.emitDebugModeToggle).toHaveBeenCalledWith('', '');
    });

    it('should expose turn status getters and delegate endTurn', () => {
        activeGameServiceSpy.activeGame = createActiveGame('existing-active-game', true);
        gameTurnServiceMock.currentPlayerName = 'Bob';
        gameTurnServiceMock.turnTimeLeftSeconds = TURN_STATUS_SECONDS;
        gameTurnServiceMock.isTurnPreparing = true;
        gameTurnServiceMock.canEndTurn = false;

        expect(component.currentPlayerName).toBe('Bob');
        expect(component.turnTimeLeftSeconds).toBe(TURN_STATUS_SECONDS);
        expect(component.isTurnPreparing).toBeTrue();
        expect(component.canEndTurn).toBeFalse();
        expect(component.isGameFinished).toBeTrue();
        expect(component.turnStatusData).toEqual({
            currentPlayerName: 'Bob',
            turnTimeLeftSeconds: TURN_STATUS_SECONDS,
            isTurnPreparing: true,
            canEndTurn: false,
        });

        component.endTurn();
        expect(gameTurnServiceMock.endTurn).toHaveBeenCalled();
    });

    it('should cleanup subscriptions and destroy turn service on destroy', () => {
        component.ngOnInit();
        routeParams$.next({ activeGameId: 'active-game-1' });

        const subscriptions = component as unknown as {
            routeSubscription?: { unsubscribe: () => void };
            playersSubscription?: { unsubscribe: () => void };
        };

        if (!subscriptions.routeSubscription || !subscriptions.playersSubscription) {
            fail('Expected subscriptions to be initialized before destroy');
            return;
        }

        const routeUnsubscribeSpy = spyOn(subscriptions.routeSubscription, 'unsubscribe');
        const playersUnsubscribeSpy = spyOn(subscriptions.playersSubscription, 'unsubscribe');

        component.ngOnDestroy();

        expect(routeUnsubscribeSpy).toHaveBeenCalled();
        expect(playersUnsubscribeSpy).toHaveBeenCalled();
        expect(gameTurnServiceMock.destroy).toHaveBeenCalled();
    });
});

type ActiveGameServiceSpy = jasmine.SpyObj<Pick<ActiveGameService, 'setActiveGame' | 'updatePlayers'>> & Pick<ActiveGameService, 'activeGame'>;

type GameTurnServiceMock = Pick<GameTurnService, 'initializeTurnListeners' | 'destroy' | 'endTurn'> & {
    currentPlayerName: string | null;
    turnTimeLeftSeconds: number | null;
    isTurnPreparing: boolean;
    canEndTurn: boolean;
};

function createActiveGame(id: string, isFinished = false): IActiveGame {
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
        _id: id,
        game,
        players: [createCharacter('Alice')],
        currentPlayerIndex: 0,
        turnOrder: ['Alice'],
        isFinished,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Alice',
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
        positionDepart: { x: 0, y: 0 },
        positionGrille: { x: 0, y: 0 },
    };
}

function createKeyboardEvent(key: string, chatTarget = false): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key });

    if (chatTarget) {
        const input = document.createElement('input');
        input.setAttribute('data-chat-message-input', '');
        Object.defineProperty(event, 'target', { value: input });
    }

    return event;
}
