/**
 * Testing strategy — Game Page Getters
 *
 * Approach:
 * - Isolate facade passthrough bindings in focused specs to keep assertions explicit.
 * - Validate getter values after mutating facade-backed state in a single deterministic setup.
 * - Cover exit behavior fallback without duplicating broader lifecycle tests.
 *
 * Edge cases covered:
 * - Missing cached route id when exiting while an active game fallback exists.
 * - Getter reads after toggling facade state in place.
 * - Local-player derived getter values for panel bindings.
 */
import { Component, signal } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { GamePageComponent } from '@app/pages/gameplay/game-page/game-page.component';
import { GamePageFacadeService } from '@app/services/gameplay/game-page.facade.service';
import { IActiveGame } from '@common/active-game';
import { CombatOutcome } from '@common/attack-result';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { Subject } from 'rxjs';

describe('GamePageComponent getters', () => {
    const GETTER_PLAYER_X = 3;
    const GETTER_PLAYER_Y = 3;
    const TURN_TIME_LEFT_SECONDS = 8;

    let fixture: ComponentFixture<GamePageComponent>;
    let component: GamePageComponent;
    let routeParams$: Subject<Params>;

    let activeGameServiceStub: {
        isLoading: ReturnType<typeof signal<boolean>>;
        combatOutcome: ReturnType<typeof signal<CombatOutcome | null>>;
        activeGame: IActiveGame | null;
    };
    let facadeStub: {
        activeGameService: typeof activeGameServiceStub;
        currentAttack: unknown;
        currentPlayerName: string | null;
        turnTimeLeftSeconds: number | null;
        isTurnPreparing: boolean;
        canEndTurn: boolean;
        isGameFinished: boolean;
        turnStatusData: { currentPlayerName: string | null; turnTimeLeftSeconds: number | null; isTurnPreparing: boolean; canEndTurn: boolean };
        pendingFlagQuestion: string | null;
        closeAllPopups: jasmine.Spy;
        connectDebugSocket: jasmine.Spy;
        connectGameLogs: jasmine.Spy;
        resolveActiveGameId: jasmine.Spy<(routeActiveGameId?: string) => string | undefined>;
        clearGameLogs: jasmine.Spy;
        setActiveGame: jasmine.Spy;
        connectGameplaySocket: jasmine.Spy;
        onPlayersUpdated: jasmine.Spy;
        applyPlayersUpdate: jasmine.Spy;
        initializeTurnListeners: jasmine.Spy;
        emitJoinGame: jasmine.Spy;
        emitDebugToggle: jasmine.Spy;
        getLocalPlayer: jasmine.Spy<() => ICharacter | undefined>;
        endTurn: jasmine.Spy;
        respondToFlagRequest: jasmine.Spy;
        abandonGame: jasmine.Spy;
        disconnectDebugSocket: jasmine.Spy;
        disconnectGameLogs: jasmine.Spy;
        destroyTurnService: jasmine.Spy;
    };

    beforeEach(async () => {
        routeParams$ = new Subject<Params>();
        const alice = createCharacter('Alice', 0, 0);

        activeGameServiceStub = {
            isLoading: signal(false),
            combatOutcome: signal(null),
            activeGame: createActiveGame('active-game-1', [alice]),
        };

        facadeStub = {
            activeGameService: activeGameServiceStub,
            currentAttack: null,
            currentPlayerName: 'Alice',
            turnTimeLeftSeconds: 15,
            isTurnPreparing: false,
            canEndTurn: true,
            isGameFinished: false,
            turnStatusData: {
                currentPlayerName: 'Alice',
                turnTimeLeftSeconds: 15,
                isTurnPreparing: false,
                canEndTurn: true,
            },
            pendingFlagQuestion: null,
            closeAllPopups: jasmine.createSpy('closeAllPopups'),
            connectDebugSocket: jasmine.createSpy('connectDebugSocket'),
            connectGameLogs: jasmine.createSpy('connectGameLogs'),
            resolveActiveGameId: jasmine.createSpy('resolveActiveGameId').and.callFake((routeActiveGameId?: string) => routeActiveGameId),
            clearGameLogs: jasmine.createSpy('clearGameLogs'),
            setActiveGame: jasmine.createSpy('setActiveGame'),
            connectGameplaySocket: jasmine.createSpy('connectGameplaySocket'),
            onPlayersUpdated: jasmine.createSpy('onPlayersUpdated').and.returnValue(new Subject<ICharacter[]>().asObservable()),
            applyPlayersUpdate: jasmine.createSpy('applyPlayersUpdate'),
            initializeTurnListeners: jasmine.createSpy('initializeTurnListeners'),
            emitJoinGame: jasmine.createSpy('emitJoinGame'),
            emitDebugToggle: jasmine.createSpy('emitDebugToggle'),
            getLocalPlayer: jasmine.createSpy('getLocalPlayer').and.returnValue(alice),
            endTurn: jasmine.createSpy('endTurn'),
            respondToFlagRequest: jasmine.createSpy('respondToFlagRequest'),
            abandonGame: jasmine.createSpy('abandonGame'),
            disconnectDebugSocket: jasmine.createSpy('disconnectDebugSocket'),
            disconnectGameLogs: jasmine.createSpy('disconnectGameLogs'),
            destroyTurnService: jasmine.createSpy('destroyTurnService'),
        };

        const overrideInfo: MetadataOverride<Component> = {
            set: {
                template: '',
                imports: [],
                providers: [{ provide: GamePageFacadeService, useValue: facadeStub }],
            },
        };
        TestBed.overrideComponent(GamePageComponent, overrideInfo);

        await TestBed.configureTestingModule({
            imports: [GamePageComponent],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        params: routeParams$.asObservable(),
                    },
                },
                { provide: Router, useValue: jasmine.createSpyObj<Pick<Router, 'navigate'>>('Router', ['navigate']) },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GamePageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('exposes facade-driven getters for panel bindings', () => {
        // Nominal case: component getters should mirror facade state exactly.
        const attackPayload = {
            attacker: 'Alice',
            defender: 'Bob',
            turnCount: 1,
            suspendedTurnTimer: 0,
            attackerPosture: null,
            defenderPosture: null,
        };
        const localPlayer = createCharacter('Charlie', GETTER_PLAYER_X, GETTER_PLAYER_Y);

        facadeStub.currentAttack = attackPayload;
        facadeStub.currentPlayerName = 'Bob';
        facadeStub.turnTimeLeftSeconds = TURN_TIME_LEFT_SECONDS;
        facadeStub.isTurnPreparing = true;
        facadeStub.canEndTurn = false;
        facadeStub.turnStatusData = {
            currentPlayerName: 'Bob',
            turnTimeLeftSeconds: TURN_TIME_LEFT_SECONDS,
            isTurnPreparing: true,
            canEndTurn: false,
        };
        facadeStub.pendingFlagQuestion = 'Would you like to transfer the flag?';
        facadeStub.getLocalPlayer.and.returnValue(localPlayer);

        expect(component.currentAttack).toBe(attackPayload);
        expect(component.currentPlayerName).toBe('Bob');
        expect(component.turnTimeLeftSeconds).toBe(TURN_TIME_LEFT_SECONDS);
        expect(component.isTurnPreparing).toBeTrue();
        expect(component.canEndTurn).toBeFalse();
        expect(component.turnStatusData).toEqual({
            currentPlayerName: 'Bob',
            turnTimeLeftSeconds: TURN_TIME_LEFT_SECONDS,
            isTurnPreparing: true,
            canEndTurn: false,
        });
        expect(component.pendingFlagQuestion).toBe('Would you like to transfer the flag?');
        expect(component.localPlayer).toBe(localPlayer);
    });

    it('falls back to active-game id from service when route id cache is missing at exit', () => {
        routeParams$.next({ activeGameId: 'game-A' });
        fixture.detectChanges();

        // Edge case: cached route id is absent, so service active-game id must be used.
        (component as unknown as { activeGameId?: string }).activeGameId = undefined;
        activeGameServiceStub.activeGame = createActiveGame('fallback-id', [createCharacter('Alice', 0, 0)]);

        component.handlePageExit();

        expect(facadeStub.abandonGame).toHaveBeenCalledTimes(1);
    });
});

function createActiveGame(id: string, players: ICharacter[]): IActiveGame {
    const game: IGame = {
        gameTitle: 'Arena',
        description: 'A strategic arena',
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
        players,
        currentPlayerIndex: 0,
        turnOrder: players.map((player) => player.name),
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Organizer',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: null,
        turnStartTimeStamp: 0,
        currentAttack: null,
    };
}

function createCharacter(name: string, x: number, y: number): ICharacter {
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
