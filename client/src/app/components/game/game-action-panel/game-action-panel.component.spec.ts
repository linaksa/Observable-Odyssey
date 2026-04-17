/* eslint-disable @typescript-eslint/no-magic-numbers -- To make the spec file easier to read */
/**
 * Testing strategy — Game Action Panel Component
 *
 * Approach:
 * - Treat the panel as a decision layer and derive UI/action permissions directly from service state mutations.
 * - Assert action toggling, combat status text, and turn controls with explicit spy-driven side-effect checks.
 *
 * Edge cases covered:
 * - Missing local player data, spectator combat context, and exhausted actions should block action pathways.
 * - Hidden/unknown turn timers should suppress timer display without breaking other computed state.
 */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameActionPanelComponent } from '@app/components/game/game-action-panel/game-action-panel.component';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { IActiveGame, ICurrentAttack } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';

describe('GameActionPanelComponent', () => {
    let fixture: ComponentFixture<GameActionPanelComponent>;
    let component: GameActionPanelComponent;

    let activeGameServiceStub: {
        actionMode: ReturnType<typeof signal<boolean>>;
        isDebugMode: jasmine.Spy<() => boolean>;
        actionStatsVersion: ReturnType<typeof signal<number>>;
        hasChangedLocation: ReturnType<typeof signal<boolean>>;
        hasAbandoned: ReturnType<typeof signal<boolean>>;
        gameHasEnded: ReturnType<typeof signal<boolean>>;
        activeGame: IActiveGame;
        toggleActionMode: jasmine.Spy;
    };
    let gameTurnServiceStub: {
        turnTimeLeftSeconds: ReturnType<typeof signal<number | null>>;
        isTurnPreparing: jasmine.Spy<() => boolean>;
        isCombatActive: jasmine.Spy<() => boolean>;
        canEndTurn: boolean;
        currentPlayerName: string | null;
        endTurn: jasmine.Spy;
    };
    let localPlayerServiceSpy: jasmine.SpyObj<Pick<LocalPlayerService, 'getLocalPlayer'>>;

    beforeEach(async () => {
        const alice = createCharacter('Alice', { actionsLeft: 1 });
        const bob = createCharacter('Bob');

        activeGameServiceStub = {
            actionMode: signal(false),
            isDebugMode: jasmine.createSpy('isDebugMode').and.returnValue(false),
            actionStatsVersion: signal(0),
            hasChangedLocation: signal(false),
            hasAbandoned: signal(false),
            gameHasEnded: signal(false),
            activeGame: createActiveGame([alice, bob], null),
            toggleActionMode: jasmine.createSpy('toggleActionMode'),
        };

        gameTurnServiceStub = {
            turnTimeLeftSeconds: signal(12),
            isTurnPreparing: jasmine.createSpy('isTurnPreparing').and.returnValue(false),
            isCombatActive: jasmine.createSpy('isCombatActive').and.returnValue(false),
            canEndTurn: true,
            currentPlayerName: 'Alice',
            endTurn: jasmine.createSpy('endTurn'),
        };

        localPlayerServiceSpy = jasmine.createSpyObj<Pick<LocalPlayerService, 'getLocalPlayer'>>('LocalPlayerService', ['getLocalPlayer']);
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(alice);

        await TestBed.configureTestingModule({
            imports: [GameActionPanelComponent],
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: GameTurnService, useValue: gameTurnServiceStub },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameActionPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('derives turn and action availability from service state', () => {
        // Nominal case: matching local-turn data exposes actionable turn controls.
        const panel = component as unknown as Record<string, (...args: unknown[]) => unknown> & {
            isLocalPlayerTurn: boolean;
            canEndTurn: boolean;
            canToggleActionMode: boolean;
            showTurnTimer: boolean;
            localPlayerHasActionLeft: () => boolean;
            localPlayer: () => ICharacter | undefined;
            currentTurnPlayerName: () => string | null;
        };

        const localPlayer = panel.localPlayer();
        expect(localPlayer?.name).toBe('Alice');
        expect(localPlayer).not.toBe(activeGameServiceStub.activeGame.players[0]);
        expect(panel.currentTurnPlayerName()).toBe('Alice');
        expect(panel.isLocalPlayerTurn).toBeTrue();
        expect(panel.localPlayerHasActionLeft()).toBeTrue();
        expect(panel.canEndTurn).toBeTrue();
        expect(panel.canToggleActionMode).toBeTrue();
        expect(panel.showTurnTimer).toBeTrue();

        activeGameServiceStub.activeGame.players[0].actionsLeft = 0;
        activeGameServiceStub.actionStatsVersion.update((version) => version + 1);
        gameTurnServiceStub.canEndTurn = false;
        fixture.detectChanges();

        expect(panel.localPlayerHasActionLeft()).toBeFalse();
        expect(panel.canEndTurn).toBeFalse();
        expect(panel.canToggleActionMode).toBeFalse();

        gameTurnServiceStub.turnTimeLeftSeconds.set(null);
        fixture.detectChanges();
        expect(panel.showTurnTimer).toBeFalse();
    });

    it('builds combat status for participants, spectators, and no-combat state', () => {
        const panel = component as unknown as { combatStatus: string; isInCombat: boolean };

        expect(panel.combatStatus).toBe('');
        expect(panel.isInCombat).toBeFalse();

        activeGameServiceStub.activeGame.currentAttack = createAttack('Alice', 'Bob');
        fixture.detectChanges();
        expect(panel.combatStatus).toBe('Combat en cours : Alice vs Bob');
        expect(panel.isInCombat).toBeTrue();

        activeGameServiceStub.activeGame.currentAttack = createAttack('Bob', 'Carol');
        fixture.detectChanges();
        expect(panel.combatStatus).toBe('Combat en cours entre Bob et Carol');
        expect(panel.isInCombat).toBeTrue();

        activeGameServiceStub.activeGame.currentAttack = null;
        gameTurnServiceStub.isCombatActive.and.returnValue(true);
        fixture.detectChanges();
        expect(panel.isInCombat).toBeTrue();
    });

    it('toggles action mode and ends turn only when conditions allow it', () => {
        const panel = component as unknown as { toggleActionMode: () => void; endTurn: () => void; canEndTurn: boolean };

        panel.toggleActionMode();
        expect(activeGameServiceStub.toggleActionMode).toHaveBeenCalledTimes(1);

        panel.endTurn();
        expect(gameTurnServiceStub.endTurn).toHaveBeenCalledTimes(1);

        gameTurnServiceStub.endTurn.calls.reset();
        gameTurnServiceStub.canEndTurn = false;
        fixture.detectChanges();

        expect(panel.canEndTurn).toBeFalse();
        panel.endTurn();
        expect(gameTurnServiceStub.endTurn).not.toHaveBeenCalled();

        activeGameServiceStub.toggleActionMode.calls.reset();
        panel.toggleActionMode();
        expect(activeGameServiceStub.toggleActionMode).not.toHaveBeenCalled();
    });

    it('treats game as finished and local turn as false when required data is missing', () => {
        // Edge case: missing local player or finished game must disable local-turn affordances.
        const panel = component as unknown as {
            isGameFinished: boolean;
            isLocalPlayerTurn: boolean;
            localPlayer: () => ICharacter | undefined;
        };

        activeGameServiceStub.activeGame.isFinished = true;
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);
        activeGameServiceStub.actionStatsVersion.update((version) => version + 1);
        fixture.detectChanges();

        expect(panel.isGameFinished).toBeTrue();
        expect(panel.localPlayer()).toBeUndefined();
        expect(panel.isLocalPlayerTurn).toBeFalse();
    });

    it('returns undefined local player when local name is absent from active players', () => {
        const panel = component as unknown as {
            localPlayer: () => ICharacter | undefined;
            isLocalPlayerTurn: boolean;
        };

        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Ghost'));
        activeGameServiceStub.actionStatsVersion.update((version) => version + 1);
        fixture.detectChanges();

        expect(panel.localPlayer()).toBeUndefined();
        expect(panel.isLocalPlayerTurn).toBeFalse();
    });
});

function createActiveGame(players: ICharacter[], currentAttack: ICurrentAttack | null): IActiveGame {
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
        currentAttack,
    };
}

function createCharacter(name: string, overrides: Partial<ICharacter> = {}): ICharacter {
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
        ...overrides,
    };
}

function createAttack(attacker: string, defender: string): ICurrentAttack {
    return {
        attacker,
        defender,
        turnCount: 1,
        suspendedTurnTimer: 5,
        attackerPosture: null,
        defenderPosture: null,
    };
}
