/**
 * Testing strategy — Wait Page Component
 *
 * Approach:
 * - Drive route and socket subjects to verify waiting-room initialization, event wiring, and page navigation transitions.
 * - Validate leave-room flows for organizer/non-organizer paths, including kick delegation and one-time execution guards.
 * - Use spies and fake timers to assert active-game initialization helpers, fallback button timing, and cleanup logic.
 *
 * Edge cases covered:
 * - Route re-emissions unsubscribe previous socket listeners before subscribing to the new game stream.
 * - Missing local-player/game payloads and mismatched game-start ids avoid unintended side effects.
 * - Destroy-time safeguards prevent duplicate leave calls and clear pending timeout handles.
 */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { WaitGridService } from '@app/services/lobby/wait-grid.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Observable, Subject } from 'rxjs';
import { WaitPageComponent } from '@app/pages/lobby/wait-page/wait-page.component';

const WAIT_BUTTON_TIMEOUT_MS = 3000;

describe('WaitPageComponent', () => {
    let component: WaitPageComponent;
    let fixture: ComponentFixture<WaitPageComponent>;

    let routeParams$: Subject<{ activeGameId: string }>;
    let socketEventStreams: Record<string, Subject<unknown>[]>;

    let socketServiceMock: jasmine.SpyObj<SocketService>;
    let routerMock: jasmine.SpyObj<Router>;
    let localPlayerServiceMock: jasmine.SpyObj<LocalPlayerService>;
    let waitGridServiceMock: jasmine.SpyObj<WaitGridService>;

    let loadingSignal: ReturnType<typeof signal<boolean>>;
    let activeGameServiceMock: ActiveGameService & {
        isLoading: ReturnType<typeof signal<boolean>>;
        setActiveGame: jasmine.Spy;
        updatePlayers: jasmine.Spy;
        leaveWaitingRoom: jasmine.Spy;
        kickPlayer: jasmine.Spy;
    };

    const organizer = createCharacter('Organizer');
    const player2 = createCharacter('Player2');
    const player3 = createCharacter('Player3');

    beforeEach(async () => {
        routeParams$ = new Subject<{ activeGameId: string }>();
        socketEventStreams = {};

        socketServiceMock = jasmine.createSpyObj<SocketService>('SocketService', ['connect', 'emit', 'on']);
        routerMock = jasmine.createSpyObj<Router>('Router', ['navigate']);
        localPlayerServiceMock = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer', 'clear']);
        waitGridServiceMock = jasmine.createSpyObj<WaitGridService>('WaitGridService', ['buildGrid', 'initFromExistingBoard']);

        socketServiceMock.on.and.callFake(<T>(_namespace: string, event: string): Observable<T> => {
            const stream = new Subject<unknown>();
            if (!socketEventStreams[event]) {
                socketEventStreams[event] = [];
            }
            socketEventStreams[event].push(stream);
            return stream.asObservable() as Observable<T>;
        });

        loadingSignal = signal(true);
        activeGameServiceMock = {
            isLoading: loadingSignal,
            activeGame: createActiveGame('active-game-id', 'Organizer', [organizer, player2, player3]),
            setActiveGame: jasmine.createSpy('setActiveGame'),
            updatePlayers: jasmine.createSpy('updatePlayers'),
            leaveWaitingRoom: jasmine.createSpy('leaveWaitingRoom'),
            kickPlayer: jasmine.createSpy('kickPlayer'),
        } as unknown as ActiveGameService & {
            isLoading: ReturnType<typeof signal<boolean>>;
            setActiveGame: jasmine.Spy;
            updatePlayers: jasmine.Spy;
            leaveWaitingRoom: jasmine.Spy;
            kickPlayer: jasmine.Spy;
        };

        localPlayerServiceMock.getLocalPlayer.and.returnValue(organizer);

        TestBed.overrideComponent(WaitPageComponent, { set: { template: '' } });

        await TestBed.configureTestingModule({
            imports: [WaitPageComponent],
            providers: [
                { provide: ActivatedRoute, useValue: { params: routeParams$.asObservable() } },
                { provide: SocketService, useValue: socketServiceMock },
                { provide: Router, useValue: routerMock },
                { provide: LocalPlayerService, useValue: localPlayerServiceMock },
                { provide: WaitGridService, useValue: waitGridServiceMock },
                { provide: ActiveGameService, useValue: activeGameServiceMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(WaitPageComponent);
        component = fixture.componentInstance;
    });

    afterEach(() => {
        fixture.destroy();
    });

    it('should initialize waiting room and wire socket subscriptions from route params', () => {
        component.ngOnInit();
        routeParams$.next({ activeGameId: 'active-game-id' });

        expect(socketServiceMock.connect).toHaveBeenCalledWith(Namespaces.Game);
        expect(socketServiceMock.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.JoinGame, {
            activeGameId: 'active-game-id',
            playerName: organizer.name,
        });
        expect(activeGameServiceMock.setActiveGame).toHaveBeenCalledWith('active-game-id');
        expect(socketServiceMock.on).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.PlayersUpdated);
        expect(socketServiceMock.on).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.GameStarted);
        expect(socketServiceMock.on).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.GameEnded);
    });

    // Edge case: When route emits again, unsubscribe previous socket subscriptions.
    it('should unsubscribe previous socket subscriptions when route emits again', () => {
        component.ngOnInit();
        routeParams$.next({ activeGameId: 'active-game-id' });

        const playersUnsubscribeSpy = spyOn(component['playersUpdatedSubscription'] as { unsubscribe: () => void }, 'unsubscribe');
        const startedUnsubscribeSpy = spyOn(component['startGameSubscription'] as { unsubscribe: () => void }, 'unsubscribe');
        const endedUnsubscribeSpy = spyOn(component['gameEndedSubscription'] as { unsubscribe: () => void }, 'unsubscribe');

        routeParams$.next({ activeGameId: 'active-game-id-2' });

        expect(playersUnsubscribeSpy).toHaveBeenCalled();
        expect(startedUnsubscribeSpy).toHaveBeenCalled();
        expect(endedUnsubscribeSpy).toHaveBeenCalled();
    });

    it('should process PlayersUpdated events', () => {
        component.ngOnInit();
        routeParams$.next({ activeGameId: 'active-game-id' });
        const initSpy = spyOn(component as unknown as { initializeActiveGameData: () => void }, 'initializeActiveGameData').and.callThrough();
        const players = [organizer, player2];

        latestEventStream<ICharacter[]>(socketEventStreams, SocketEvent.PlayersUpdated).next(players);

        expect(activeGameServiceMock.updatePlayers).toHaveBeenCalledWith(players);
        expect(initSpy).toHaveBeenCalled();
    });

    it('should navigate to play page when GameStarted id matches current game', () => {
        component.ngOnInit();
        routeParams$.next({ activeGameId: 'active-game-id' });

        latestEventStream<string>(socketEventStreams, SocketEvent.GameStarted).next('active-game-id');

        expect(routerMock.navigate).toHaveBeenCalledWith(['/play', 'active-game-id']);
    });

    // Edge case: When id does not match, ignore GameStarted event.
    it('should ignore GameStarted event when id does not match', () => {
        component.ngOnInit();
        routeParams$.next({ activeGameId: 'active-game-id' });

        latestEventStream<string>(socketEventStreams, SocketEvent.GameStarted).next('other-id');

        expect(routerMock.navigate).not.toHaveBeenCalledWith(['/play', 'other-id']);
    });

    it('should clear local player and navigate home on GameEnded', () => {
        component.ngOnInit();
        routeParams$.next({ activeGameId: 'active-game-id' });

        latestEventStream<{ winner: string | null }>(socketEventStreams, SocketEvent.GameEnded).next({ winner: null });

        expect(localPlayerServiceMock.clear).toHaveBeenCalled();
        expect(routerMock.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should kick other players when organizer leaves', () => {
        component.localPlayer = organizer;

        component.goBack();

        expect(activeGameServiceMock.kickPlayer).toHaveBeenCalledWith(player2.name);
        expect(activeGameServiceMock.kickPlayer).toHaveBeenCalledWith(player3.name);
        expect(activeGameServiceMock.kickPlayer).not.toHaveBeenCalledWith(organizer.name);
        expect(activeGameServiceMock.leaveWaitingRoom).toHaveBeenCalledWith(organizer.name);
        expect(localPlayerServiceMock.clear).toHaveBeenCalled();
    });

    // Edge case: When non-organizer leaves, it should not kick players.
    it('should not kick players when non-organizer leaves', () => {
        const nonOrganizer = createCharacter('Guest');
        component.localPlayer = nonOrganizer;
        activeGameServiceMock.activeGame = createActiveGame('active-game-id', organizer.name, [organizer, nonOrganizer, player2]);

        component.goBack();

        expect(activeGameServiceMock.kickPlayer).not.toHaveBeenCalled();
        expect(activeGameServiceMock.leaveWaitingRoom).toHaveBeenCalledWith(nonOrganizer.name);
    });

    // Edge case: When local player or active game id is missing, it should not leave waiting room.
    it('should not leave waiting room when local player or active game id is missing', () => {
        component.localPlayer = undefined;
        localPlayerServiceMock.getLocalPlayer.and.returnValue(undefined);

        component.goBack();

        expect(activeGameServiceMock.leaveWaitingRoom).not.toHaveBeenCalled();

        component.localPlayer = organizer;
        activeGameServiceMock.activeGame = undefined as unknown as IActiveGame;
        component.goBack();

        expect(activeGameServiceMock.leaveWaitingRoom).not.toHaveBeenCalled();
    });

    it('should execute leave logic only once even if goBack is called multiple times', () => {
        component.localPlayer = organizer;

        component.goBack();
        component.goBack();

        expect(activeGameServiceMock.leaveWaitingRoom).toHaveBeenCalledTimes(1);
    });

    // Edge case: When game has started, it should not leave again on destroy.
    it('should not leave again on destroy if game has started', () => {
        component['gameStarted'] = true;
        component.localPlayer = organizer;

        component.ngOnDestroy();

        expect(activeGameServiceMock.leaveWaitingRoom).not.toHaveBeenCalled();
    });

    it('should execute exit logic on beforeunload', () => {
        component.localPlayer = organizer;

        component.onBeforeUnload();

        expect(activeGameServiceMock.leaveWaitingRoom).toHaveBeenCalledWith(organizer.name);
    });

    // Edge case: When active game data initializes without local player, navigate to error.
    it('should navigate to error when active game data initializes without local player', () => {
        localPlayerServiceMock.getLocalPlayer.and.returnValue(undefined);
        activeGameServiceMock.activeGame = createActiveGame('active-game-id', organizer.name, [organizer, player2]);

        (component as unknown as { initializeActiveGameData: () => void }).initializeActiveGameData();

        expect(routerMock.navigate).toHaveBeenCalledWith(['/error']);
    });

    // Edge case: When game payload is missing, skip active game initialization.
    it('should skip active game initialization when game payload is missing', () => {
        activeGameServiceMock.activeGame = undefined as unknown as IActiveGame;

        (component as unknown as { initializeActiveGameData: () => void }).initializeActiveGameData();

        expect(waitGridServiceMock.buildGrid).not.toHaveBeenCalled();
        expect(waitGridServiceMock.initFromExistingBoard).not.toHaveBeenCalled();
    });

    it('should initialize active game data in constructor when loading is false', () => {
        loadingSignal.set(false);
        const secondFixture = TestBed.createComponent(WaitPageComponent);
        secondFixture.detectChanges();
        secondFixture.destroy();

        expect(waitGridServiceMock.buildGrid).toHaveBeenCalled();
        expect(waitGridServiceMock.initFromExistingBoard).toHaveBeenCalled();
    });

    // Edge case: When the waiting state exceeds the timeout, the fallback button should become visible.
    it('should show fallback button after timeout', fakeAsync(() => {
        component['initializeButtonTimeout']();
        expect(component.showButton).toBeFalse();

        tick(WAIT_BUTTON_TIMEOUT_MS);

        expect(component.showButton).toBeTrue();
    }));

    // Edge case: When destroy runs with an active timeout, it should clear the timeout handle.
    it('should clear button timeout on destroy', () => {
        const clearTimeoutSpy = spyOn(window, 'clearTimeout').and.callThrough();
        component['initializeButtonTimeout']();
        component['gameStarted'] = true;

        component.ngOnDestroy();

        expect(clearTimeoutSpy).toHaveBeenCalled();
    });
});

function latestEventStream<T>(streams: Record<string, Subject<unknown>[]>, event: SocketEvent): Subject<T> {
    return streams[event][streams[event].length - 1] as Subject<T>;
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
        attackPoints: 5,
        defensePoints: 5,
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

function createActiveGame(id: string, organizerName: string, players: ICharacter[]): IActiveGame {
    return {
        _id: id,
        game: {
            gameTitle: 'Test game',
            description: 'desc',
            gameMode: GameType.Classic,
            lastModifiedDate: new Date('2024-01-01'),
            dateCreated: new Date('2024-01-01'),
            visibility: Visibility.Viewable,
            board: {
                cells: [[CellType.Empty], [CellType.Empty]],
                items: [],
            },
        },
        players,
        currentPlayerIndex: 0,
        turnOrder: [],
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName,
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: '',

        turnStartTimeStamp: 0,
        currentAttack: null,
    };
}
