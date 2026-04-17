/**
 * Testing strategy — Game Page Component
 *
 * Approach:
 * - Exercise gameplay orchestration from route changes to socket wiring and player updates.
 * - Assert component-to-facade delegation for actions, shortcuts, and teardown side effects.
 * - Keep specs deterministic with controlled signals, subjects, and route emissions.
 *
 * Edge cases covered:
 * - Repeated route emissions and missing resolved game identifiers.
 * - Combat outcomes where the local player is not directly involved.
 * - Exit guards that prevent duplicate or invalid abandon requests.
 */
import { Component, signal } from '@angular/core';
import { ComponentFixture, fakeAsync, MetadataOverride, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { GAME_PAGE_RETURN_BUTTON_DELAY_MS } from '@app/constants/gameplay';
import { GamePageComponent } from '@app/pages/gameplay/game-page/game-page.component';
import { GamePageFacadeService } from '@app/services/gameplay/game-page.facade.service';
import { IActiveGame } from '@common/active-game';
import { CombatOutcome } from '@common/attack-result';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { Subject } from 'rxjs';

describe('GamePageComponent', () => {
    let fixture: ComponentFixture<GamePageComponent>;
    let component: GamePageComponent;

    let routeParams$: Subject<Params>;
    let playersUpdated$: Subject<ICharacter[]>;

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
    let routerSpy: jasmine.SpyObj<Pick<Router, 'navigate'>>;

    beforeEach(async () => {
        routeParams$ = new Subject<Params>();
        playersUpdated$ = new Subject<ICharacter[]>();

        const alice = createCharacter('Alice', 0, 0);
        const bob = createCharacter('Bob', 1, 0);

        activeGameServiceStub = {
            isLoading: signal(false),
            combatOutcome: signal(null),
            activeGame: createActiveGame('active-game-1', [alice, bob]),
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
            onPlayersUpdated: jasmine.createSpy('onPlayersUpdated').and.returnValue(playersUpdated$.asObservable()),
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

        routerSpy = jasmine.createSpyObj<Pick<Router, 'navigate'>>('Router', ['navigate']);
        routerSpy.navigate.and.returnValue(Promise.resolve(true));

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
                { provide: Router, useValue: routerSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GamePageComponent);
        component = fixture.componentInstance;
    });

    it('initializes gameplay subscriptions and processes route changes with clear-game-logs boundaries', () => {
        fixture.detectChanges();

        // Nominal case: initial lifecycle hooks wire popups, debug, and game logs.
        expect(facadeStub.closeAllPopups).toHaveBeenCalled();
        expect(facadeStub.connectDebugSocket).toHaveBeenCalled();
        expect(facadeStub.connectGameLogs).toHaveBeenCalled();

        // Nominal case: first route id initializes gameplay socket flow.
        routeParams$.next({ activeGameId: 'game-A' });
        expect(facadeStub.resolveActiveGameId).toHaveBeenCalledWith('game-A');
        expect(facadeStub.clearGameLogs).toHaveBeenCalledTimes(1);
        expect(facadeStub.setActiveGame).toHaveBeenCalledWith('game-A');
        expect(facadeStub.connectGameplaySocket).toHaveBeenCalledTimes(1);
        expect(facadeStub.initializeTurnListeners).toHaveBeenCalledTimes(1);
        expect(facadeStub.emitJoinGame).toHaveBeenCalledWith('game-A');

        const updatedPlayers = [createCharacter('Eve', 2, 2)];
        playersUpdated$.next(updatedPlayers);
        expect(facadeStub.applyPlayersUpdate).toHaveBeenCalledWith(updatedPlayers);

        // Edge case: repeated route id should not reconnect gameplay socket.
        routeParams$.next({ activeGameId: 'game-A' });
        expect(facadeStub.clearGameLogs).toHaveBeenCalledTimes(1);
        expect(facadeStub.connectGameplaySocket).toHaveBeenCalledTimes(1);
        expect(facadeStub.emitJoinGame).toHaveBeenCalledTimes(2);

        // Edge case: changing route id should refresh logs and active game context.
        routeParams$.next({ activeGameId: 'game-B' });
        expect(facadeStub.clearGameLogs).toHaveBeenCalledTimes(2);
        expect(facadeStub.setActiveGame).toHaveBeenCalledWith('game-B');
    });

    it('keeps loading true until join was attempted and active game exists, then reveals delayed return button', fakeAsync(() => {
        fixture.detectChanges();
        const page = component as unknown as {
            isLoading: () => boolean;
            showButton: () => boolean;
        };

        // Nominal case: page stays loading until a join attempt with an active game exists.
        expect(page.isLoading()).toBeTrue();
        expect(page.showButton()).toBeFalse();

        tick(GAME_PAGE_RETURN_BUTTON_DELAY_MS - 1);
        expect(page.showButton()).toBeFalse();

        routeParams$.next({ activeGameId: 'game-A' });
        fixture.detectChanges();
        expect(page.isLoading()).toBeFalse();

        tick(1);
        fixture.detectChanges();
        expect(page.showButton()).toBeTrue();

        // Edge case: service loading or missing active game forces loading state again.
        activeGameServiceStub.isLoading.set(true);
        fixture.detectChanges();
        expect(page.isLoading()).toBeTrue();

        activeGameServiceStub.isLoading.set(false);
        activeGameServiceStub.activeGame = null;
        fixture.detectChanges();
        expect(page.isLoading()).toBeTrue();
    }));

    it('shows combat outcome only when local player is winner or loser', () => {
        fixture.detectChanges();
        routeParams$.next({ activeGameId: 'game-A' });
        fixture.detectChanges();

        const page = component as unknown as {
            visibleOutcome: () => CombatOutcome | null;
        };

        const localWinOutcome = createOutcome('Alice', ['Bob']);
        // Nominal case: local player wins, outcome must be visible.
        activeGameServiceStub.combatOutcome.set(localWinOutcome);
        expect(page.visibleOutcome()).toBe(localWinOutcome);

        const localLossOutcome = createOutcome('Bob', ['Alice']);
        // Nominal case: local player loses, outcome must still be visible.
        activeGameServiceStub.combatOutcome.set(localLossOutcome);
        expect(page.visibleOutcome()).toBe(localLossOutcome);

        // Edge case: unrelated combat outcome should be hidden from local player.
        activeGameServiceStub.combatOutcome.set(createOutcome('Bob', ['Eve']));
        expect(page.visibleOutcome()).toBeNull();

        // Edge case: missing local player context hides outcome as well.
        facadeStub.getLocalPlayer.and.returnValue(undefined);
        activeGameServiceStub.combatOutcome.set(localWinOutcome);
        expect(page.visibleOutcome()).toBeNull();
    });

    it('forwards actions and keyboard shortcuts while respecting chat-input guard', () => {
        fixture.detectChanges();

        // Nominal case: direct action handlers delegate to facade.
        component.endTurn();
        expect(facadeStub.endTurn).toHaveBeenCalled();

        component.respondToFlagRequest(false);
        expect(facadeStub.respondToFlagRequest).toHaveBeenCalledWith(false);

        component.handleKeyDown(new KeyboardEvent('keydown', { key: 'M' }));
        expect(facadeStub.emitDebugToggle).toHaveBeenCalledTimes(1);

        // Edge case: shortcut is ignored while typing in chat input.
        const input = document.createElement('input');
        input.setAttribute('data-chat-message-input', 'true');
        component.handleKeyDown({ key: 'm', target: input } as unknown as KeyboardEvent);
        expect(facadeStub.emitDebugToggle).toHaveBeenCalledTimes(1);

        component.handleKeyDown(new KeyboardEvent('keydown', { key: 'x' }));
        expect(facadeStub.emitDebugToggle).toHaveBeenCalledTimes(1);
    });

    it('exits and abandons game only once when all exit preconditions are met', () => {
        fixture.detectChanges();
        routeParams$.next({ activeGameId: 'game-A' });
        fixture.detectChanges();

        // Nominal case: first exit abandons the game.
        component.handlePageExit();
        expect(facadeStub.abandonGame).toHaveBeenCalledTimes(1);

        // Edge case: subsequent exits must not duplicate abandonment.
        component.handlePageExit();
        expect(facadeStub.abandonGame).toHaveBeenCalledTimes(1);

        fixture.destroy();
        expect(facadeStub.disconnectDebugSocket).toHaveBeenCalled();
        expect(facadeStub.disconnectGameLogs).toHaveBeenCalled();
        expect(facadeStub.destroyTurnService).toHaveBeenCalled();
    });

    it('does not abandon when join was never attempted, game finished, local player missing, or id missing', () => {
        fixture.detectChanges();

        // Edge case: before join attempt, exiting should do nothing.
        component.handlePageExit();
        expect(facadeStub.abandonGame).not.toHaveBeenCalled();

        routeParams$.next({ activeGameId: 'game-A' });
        fixture.detectChanges();

        facadeStub.isGameFinished = true;
        component.handlePageExit();
        expect(facadeStub.abandonGame).not.toHaveBeenCalled();

        facadeStub.isGameFinished = false;
        facadeStub.getLocalPlayer.and.returnValue(undefined);
        component.handlePageExit();
        expect(facadeStub.abandonGame).not.toHaveBeenCalled();

        facadeStub.getLocalPlayer.and.returnValue(createCharacter('Alice', 0, 0));
        facadeStub.resolveActiveGameId.and.returnValue(undefined);
        activeGameServiceStub.activeGame = null;

        // Edge case: unresolved route and missing active game fallback should block abandon.
        const orphanFixture = TestBed.createComponent(GamePageComponent);
        const orphanComponent = orphanFixture.componentInstance;
        orphanFixture.detectChanges();
        routeParams$.next({ activeGameId: 'missing-id' });
        orphanFixture.detectChanges();

        orphanComponent.handlePageExit();
        expect(facadeStub.abandonGame).not.toHaveBeenCalled();

        orphanFixture.destroy();
    });

    it('abandons game and navigates home when abandon action is triggered', fakeAsync(() => {
        fixture.detectChanges();
        routeParams$.next({ activeGameId: 'game-A' });
        fixture.detectChanges();

        // Nominal case: explicit abandon action both abandons and redirects home.
        component.abandonGame();
        tick();

        expect(facadeStub.abandonGame).toHaveBeenCalledTimes(1);
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    }));
});

function createOutcome(winner: string | null, losers: string[]): CombatOutcome {
    return {
        updatedActiveGame: createActiveGame('outcome-game', [createCharacter('Alice', 0, 0), createCharacter('Bob', 1, 0)]),
        winner,
        losers,
        cancelled: false,
    };
}

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
