/**
 * Testing strategy — WaitPageFacadeService
 *
 * Approach:
 * - Mock waiting-room collaborators and assert facade delegation for connect, join, and socket stream access.
 * - Verify organizer actions and cleanup helpers that coordinate wait-page state.
 *
 * Edge cases covered:
 * - Grid initialization exits safely when active game data is unavailable.
 * - Kick actions are ignored when the local player is not the organizer.
 */
import { TestBed } from '@angular/core/testing';
import { WaitPageFacadeService } from '@app/services/lobby/wait-page.facade.service';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { WaitGridService } from '@app/services/lobby/wait-grid.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { GameType, Visibility } from '@common/game';
import { IGameEndedPayload } from '@common/socket-payloads';
import { Observable, Subject } from 'rxjs';

describe('WaitPageFacadeService', () => {
    let service: WaitPageFacadeService;
    let activeGameServiceStub: {
        activeGame?: IActiveGame;
        setActiveGame: jasmine.Spy;
        updatePlayers: jasmine.Spy;
        kickPlayer: jasmine.Spy;
        leaveWaitingRoom: jasmine.Spy;
    };
    let waitGridServiceSpy: jasmine.SpyObj<WaitGridService>;
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let socketServiceSpy: jasmine.SpyObj<SocketService>;
    let playersUpdated$: Subject<ICharacter[]>;
    let gameStarted$: Subject<string>;
    let gameEnded$: Subject<IGameEndedPayload>;

    beforeEach(() => {
        activeGameServiceStub = {
            activeGame: undefined,
            setActiveGame: jasmine.createSpy('setActiveGame'),
            updatePlayers: jasmine.createSpy('updatePlayers'),
            kickPlayer: jasmine.createSpy('kickPlayer'),
            leaveWaitingRoom: jasmine.createSpy('leaveWaitingRoom'),
        };
        waitGridServiceSpy = jasmine.createSpyObj<WaitGridService>('WaitGridService', ['buildGrid', 'initFromExistingBoard']);
        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer', 'clear']);
        socketServiceSpy = jasmine.createSpyObj<SocketService>('SocketService', ['connect', 'emit', 'on']);

        playersUpdated$ = new Subject<ICharacter[]>();
        gameStarted$ = new Subject<string>();
        gameEnded$ = new Subject<IGameEndedPayload>();
        socketServiceSpy.on.and.callFake(((_: string, event: string) => {
            if (event === SocketEvent.PlayersUpdated) return playersUpdated$.asObservable();
            if (event === SocketEvent.GameStarted) return gameStarted$.asObservable();
            return gameEnded$.asObservable();
        }) as unknown as <T>(namespace: string, event: string) => Observable<T>);

        TestBed.configureTestingModule({
            providers: [
                WaitPageFacadeService,
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: WaitGridService, useValue: waitGridServiceSpy },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
                { provide: SocketService, useValue: socketServiceSpy },
            ],
        });

        service = TestBed.inject(WaitPageFacadeService);
    });

    it('connects, emits join payload, and loads active game', () => {
        // Nominal case
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createPlayer('Alice'));

        service.connectAndJoinWaitingRoom('active-1');

        expect(socketServiceSpy.connect).toHaveBeenCalledWith(Namespaces.Game);
        expect(socketServiceSpy.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.JoinGame, {
            activeGameId: 'active-1',
            playerName: 'Alice',
        });
        expect(activeGameServiceStub.setActiveGame).toHaveBeenCalledWith('active-1');
    });

    it('returns socket streams for player/game events', () => {
        // Nominal case
        const playersReceived: ICharacter[][] = [];
        const startsReceived: string[] = [];
        const endedReceived: IGameEndedPayload[] = [];

        service.onPlayersUpdated().subscribe((value) => playersReceived.push(value));
        service.onGameStarted().subscribe((value) => startsReceived.push(value));
        service.onGameEnded().subscribe((value) => endedReceived.push(value));

        playersUpdated$.next([createPlayer('Alice')]);
        gameStarted$.next('game-1');
        gameEnded$.next({ winner: 'Alice' });

        expect(playersReceived.length).toBe(1);
        expect(startsReceived).toEqual(['game-1']);
        expect(endedReceived).toEqual([{ winner: 'Alice' }]);
    });

    it('delegates player and local-player helpers', () => {
        // Nominal case
        const player = createPlayer('Alice');
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(player);

        service.updatePlayers([player]);
        expect(activeGameServiceStub.updatePlayers).toHaveBeenCalledWith([player]);

        expect(service.getLocalPlayer()).toBe(player);
        expect(service.getLocalPlayerName(player)).toBe('Alice');
        expect(service.getLocalPlayerName(undefined)).toBe('Alice');

        service.clearLocalPlayer();
        expect(localPlayerServiceSpy.clear).toHaveBeenCalled();
    });

    it('initializes grid from active game when available', () => {
        // Nominal case
        const activeGame = createActiveGame([createPlayer('Alice')]);
        activeGameServiceStub.activeGame = activeGame;

        service.initializeGridFromActiveGame();

        expect(waitGridServiceSpy.buildGrid).toHaveBeenCalledWith(1);
        const clonedArgument = waitGridServiceSpy.initFromExistingBoard.calls.mostRecent().args[0] as IActiveGame;
        expect(clonedArgument).not.toBe(activeGame);
        expect(clonedArgument.players[0].name).toBe('Alice');
    });

    it('does not initialize grid when active game is missing', () => {
        // Edge case
        activeGameServiceStub.activeGame = undefined;

        service.initializeGridFromActiveGame();

        expect(waitGridServiceSpy.buildGrid).not.toHaveBeenCalled();
        expect(waitGridServiceSpy.initFromExistingBoard).not.toHaveBeenCalled();
    });

    it('handles organizer-only kick logic and cleanup helpers', () => {
        // Edge case
        activeGameServiceStub.activeGame = createActiveGame([createPlayer('Organizer'), createPlayer('Bob'), createPlayer('Carol')], 'Organizer');

        service.kickOtherPlayersIfOrganizer('Organizer');
        expect(activeGameServiceStub.kickPlayer).toHaveBeenCalledWith('Bob');
        expect(activeGameServiceStub.kickPlayer).toHaveBeenCalledWith('Carol');

        activeGameServiceStub.kickPlayer.calls.reset();
        service.kickOtherPlayersIfOrganizer('Bob');
        expect(activeGameServiceStub.kickPlayer).not.toHaveBeenCalled();

        service.kickPlayer('Bob');
        service.leaveWaitingRoom('Alice');
        service.leaveWaitingRoomAndCleanup('Alice');
        service.clearAndRedirectAfterGameEnded();

        expect(activeGameServiceStub.kickPlayer).toHaveBeenCalledWith('Bob');
        expect(activeGameServiceStub.leaveWaitingRoom).toHaveBeenCalledWith('Alice');
        expect(localPlayerServiceSpy.clear).toHaveBeenCalledTimes(2);
    });

    it('starts game only when started id matches active game id', () => {
        // Nominal case
        activeGameServiceStub.activeGame = createActiveGame([createPlayer('Alice')]);

        expect(service.shouldStartGame('game-1')).toBeTrue();
        expect(service.shouldStartGame('other-game')).toBeFalse();
        expect(service.shouldStartGame('')).toBeFalse();
    });

    function createPlayer(name: string): ICharacter {
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
            movementLeft: 3,
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

    function createActiveGame(players: ICharacter[], organizerName = players[0]?.name ?? 'Alice'): IActiveGame {
        return {
            _id: 'game-1',
            game: {
                gameTitle: 'Game',
                description: 'Desc',
                gameMode: GameType.Classic,
                lastModifiedDate: new Date(),
                dateCreated: new Date(),
                visibility: Visibility.Viewable,
                board: {
                    cells: [[CellType.Empty]],
                    items: [],
                },
            },
            players,
            currentPlayerIndex: 0,
            turnOrder: players.map((player) => player.name),
            isFinished: false,
            winner: null,
            messages: [],
            isDebugMode: false,
            organizerName,
            maxPlayerCount: 4,
            turnIsInPreparation: false,
            hasFlagId: null,
            turnStartTimeStamp: Date.now(),
            currentAttack: null,
        };
    }
});
