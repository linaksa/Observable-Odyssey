/**
 * Testing strategy — GamePageFacadeService
 *
 * Approach:
 * - Stub facade dependencies and verify orchestration/delegation through each facade method.
 * - Assert computed getters proxy the latest signal/service values exposed to the component layer.
 *
 * Edge cases covered:
 * - Missing local player or route id falls back to safe defaults when building emitted payloads.
 * - Finished-game state resolves correctly from either signal flags or active-game metadata.
 */
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GamePageFacadeService } from '@app/services/gameplay/game-page.facade.service';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GamePopupStateService } from '@app/services/gameplay/game-popup-state.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { DebugSocketService } from '@app/services/realtime/debug.socket.service';
import { GameLogService } from '@app/services/realtime/game-log.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { ICurrentAttack } from '@common/active-game';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Subject } from 'rxjs';

const TURN_TIME_LEFT_SECONDS = 18;

describe('GamePageFacadeService', () => {
    let service: GamePageFacadeService;
    let activeGameServiceStub: {
        activeGame?: { _id: string; isFinished: boolean; currentAttack: ICurrentAttack | null };
        gameHasEnded: jasmine.Spy;
        setActiveGame: jasmine.Spy;
        updatePlayers: jasmine.Spy;
        resetTransientUiState: jasmine.Spy;
        respondToFlagActionRequest: jasmine.Spy;
        abandonGame: jasmine.Spy;
        pendingFlagRequest: jasmine.Spy;
    };
    let gameTurnServiceStub: {
        currentPlayerName: string | null;
        turnTimeLeftSeconds: ReturnType<typeof signal<number | null>>;
        isTurnPreparing: ReturnType<typeof signal<boolean>>;
        canEndTurn: boolean;
        initializeTurnListeners: jasmine.Spy;
        endTurn: jasmine.Spy;
        destroy: jasmine.Spy;
    };
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let debugSocketServiceSpy: jasmine.SpyObj<DebugSocketService>;
    let socketServiceSpy: jasmine.SpyObj<SocketService>;
    let gameLogServiceSpy: jasmine.SpyObj<GameLogService>;
    let popupStateServiceSpy: jasmine.SpyObj<GamePopupStateService>;
    let playersUpdated$: Subject<ICharacter[]>;

    beforeEach(() => {
        activeGameServiceStub = {
            activeGame: { _id: 'game-1', isFinished: false, currentAttack: null },
            gameHasEnded: jasmine.createSpy('gameHasEnded').and.returnValue(false),
            setActiveGame: jasmine.createSpy('setActiveGame'),
            updatePlayers: jasmine.createSpy('updatePlayers'),
            resetTransientUiState: jasmine.createSpy('resetTransientUiState'),
            respondToFlagActionRequest: jasmine.createSpy('respondToFlagActionRequest'),
            abandonGame: jasmine.createSpy('abandonGame'),
            pendingFlagRequest: jasmine.createSpy('pendingFlagRequest').and.returnValue(null),
        };
        gameTurnServiceStub = {
            currentPlayerName: 'Alice',
            turnTimeLeftSeconds: signal<number | null>(TURN_TIME_LEFT_SECONDS),
            isTurnPreparing: signal(false),
            canEndTurn: true,
            initializeTurnListeners: jasmine.createSpy('initializeTurnListeners'),
            endTurn: jasmine.createSpy('endTurn'),
            destroy: jasmine.createSpy('destroy'),
        };

        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer']);
        debugSocketServiceSpy = jasmine.createSpyObj<DebugSocketService>('DebugSocketService', ['connect', 'disconnect', 'emitDebugModeToggle']);
        socketServiceSpy = jasmine.createSpyObj<SocketService>('SocketService', ['connect', 'emit', 'on']);
        gameLogServiceSpy = jasmine.createSpyObj<GameLogService>('GameLogService', ['connect', 'disconnect', 'clear']);
        popupStateServiceSpy = jasmine.createSpyObj<GamePopupStateService>('GamePopupStateService', ['closeAllPopups']);

        playersUpdated$ = new Subject<ICharacter[]>();
        socketServiceSpy.on.and.returnValue(playersUpdated$.asObservable());

        TestBed.configureTestingModule({
            providers: [
                GamePageFacadeService,
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: GameTurnService, useValue: gameTurnServiceStub },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
                { provide: DebugSocketService, useValue: debugSocketServiceSpy },
                { provide: SocketService, useValue: socketServiceSpy },
                { provide: GameLogService, useValue: gameLogServiceSpy },
                { provide: GamePopupStateService, useValue: popupStateServiceSpy },
            ],
        });

        service = TestBed.inject(GamePageFacadeService);
    });

    it('exposes computed getter values from dependencies', () => {
        // Nominal case
        activeGameServiceStub.activeGame = {
            _id: 'game-1',
            isFinished: false,
            currentAttack: {
                attacker: 'Alice',
                defender: 'Bob',
                turnCount: 1,
                suspendedTurnTimer: 1000,
                attackerPosture: null,
                defenderPosture: null,
            },
        };
        activeGameServiceStub.pendingFlagRequest.and.returnValue({ question: 'Take the flag?' });

        expect(service.currentAttack?.attacker).toBe('Alice');
        expect(service.currentPlayerName).toBe('Alice');
        expect(service.turnTimeLeftSeconds).toBe(TURN_TIME_LEFT_SECONDS);
        expect(service.isTurnPreparing).toBeFalse();
        expect(service.canEndTurn).toBeTrue();
        expect(service.turnStatusData).toEqual({
            currentPlayerName: 'Alice',
            turnTimeLeftSeconds: TURN_TIME_LEFT_SECONDS,
            isTurnPreparing: false,
            canEndTurn: true,
        });
        expect(service.pendingFlagQuestion).toBe('Take the flag?');
    });

    it('computes game finished state from active game or signal', () => {
        // Edge case
        activeGameServiceStub.gameHasEnded.and.returnValue(false);
        activeGameServiceStub.activeGame = { _id: 'game-1', isFinished: true, currentAttack: null };
        expect(service.isGameFinished).toBeTrue();

        activeGameServiceStub.gameHasEnded.and.returnValue(true);
        activeGameServiceStub.activeGame = { _id: 'game-1', isFinished: false, currentAttack: null };
        expect(service.isGameFinished).toBeTrue();

        activeGameServiceStub.gameHasEnded.and.returnValue(false);
        activeGameServiceStub.activeGame = { _id: 'game-1', isFinished: false, currentAttack: null };
        expect(service.isGameFinished).toBeFalse();
    });

    it('delegates socket/log/debug lifecycle operations', () => {
        // Nominal case
        service.connectGameplaySocket();
        service.connectGameLogs();
        service.disconnectGameLogs();
        service.clearGameLogs();
        service.connectDebugSocket();
        service.disconnectDebugSocket();
        service.initializeTurnListeners();
        service.endTurn();
        service.destroyTurnService();

        expect(socketServiceSpy.connect).toHaveBeenCalledWith(Namespaces.Game);
        expect(gameLogServiceSpy.connect).toHaveBeenCalled();
        expect(gameLogServiceSpy.disconnect).toHaveBeenCalled();
        expect(gameLogServiceSpy.clear).toHaveBeenCalled();
        expect(debugSocketServiceSpy.connect).toHaveBeenCalled();
        expect(debugSocketServiceSpy.disconnect).toHaveBeenCalled();
        expect(gameTurnServiceStub.initializeTurnListeners).toHaveBeenCalled();
        expect(gameTurnServiceStub.endTurn).toHaveBeenCalled();
        expect(gameTurnServiceStub.destroy).toHaveBeenCalled();
    });

    it('emits join and debug toggle payloads with player fallback behavior', () => {
        // Edge case
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);
        activeGameServiceStub.activeGame = undefined;

        service.emitJoinGame('game-2');
        service.emitDebugToggle();

        expect(socketServiceSpy.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.JoinGame, {
            activeGameId: 'game-2',
            playerName: undefined,
        });
        expect(debugSocketServiceSpy.emitDebugModeToggle).toHaveBeenCalledWith('', '');
    });

    it('delegates players updates and active-game actions', () => {
        // Nominal case
        const players = [createPlayer('Alice')];
        const receivedUpdates: ICharacter[][] = [];
        service.onPlayersUpdated().subscribe((value) => receivedUpdates.push(value));
        playersUpdated$.next(players);

        service.applyPlayersUpdate(players);
        service.setActiveGame('game-9');
        service.respondToFlagRequest(true);
        service.closeAllPopups();

        expect(receivedUpdates).toEqual([players]);
        expect(activeGameServiceStub.updatePlayers).toHaveBeenCalledWith(players);
        expect(activeGameServiceStub.setActiveGame).toHaveBeenCalledWith('game-9');
        expect(activeGameServiceStub.respondToFlagActionRequest).toHaveBeenCalledWith(true);
        expect(popupStateServiceSpy.closeAllPopups).toHaveBeenCalled();
        expect(activeGameServiceStub.resetTransientUiState).toHaveBeenCalled();
    });

    it('resolves active game id with route value fallback', () => {
        // Nominal case
        activeGameServiceStub.activeGame = { _id: 'stored-game', isFinished: false, currentAttack: null };

        expect(service.resolveActiveGameId('route-game')).toBe('route-game');
        expect(service.resolveActiveGameId(undefined)).toBe('stored-game');
    });

    it('abandons game only when a local player exists', () => {
        // Edge case
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);
        service.abandonGame();
        expect(activeGameServiceStub.abandonGame).not.toHaveBeenCalled();

        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createPlayer('Alice'));
        service.abandonGame();
        expect(activeGameServiceStub.abandonGame).toHaveBeenCalledWith('Alice');
    });

    it('returns local player and null pending question safely', () => {
        // Edge case
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createPlayer('Alice'));
        activeGameServiceStub.pendingFlagRequest.and.returnValue(null);

        expect(service.getLocalPlayer()?.name).toBe('Alice');
        expect(service.pendingFlagQuestion).toBeNull();
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
});
/* Merged from game-page.facade.service.extra.spec.ts */

(() => {
    describe('GamePageFacadeService (extra)', () => {
        let service: GamePageFacadeService;
        let activeGameServiceStub: {
            activeGame?: { _id: string; isFinished: boolean };
            gameHasEnded: jasmine.Spy;
        };

        beforeEach(() => {
            activeGameServiceStub = {
                activeGame: undefined,
                gameHasEnded: jasmine.createSpy('gameHasEnded').and.returnValue(false),
            };

            TestBed.configureTestingModule({
                providers: [
                    GamePageFacadeService,
                    { provide: ActiveGameService, useValue: activeGameServiceStub },
                    { provide: GamePopupStateService, useValue: {} },
                    { provide: GameTurnService, useValue: {} },
                    { provide: LocalPlayerService, useValue: {} },
                    { provide: DebugSocketService, useValue: {} },
                    { provide: SocketService, useValue: {} },
                    { provide: GameLogService, useValue: {} },
                ],
            });

            service = TestBed.inject(GamePageFacadeService);
        });

        it('returns false when active game is missing and gameHasEnded is false', () => {
            activeGameServiceStub.gameHasEnded.and.returnValue(false);
            activeGameServiceStub.activeGame = undefined;

            expect(service.isGameFinished).toBeFalse();
        });
    });
})();
