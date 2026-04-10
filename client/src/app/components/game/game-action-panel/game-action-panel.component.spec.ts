/**
 * Testing strategy — GameActionPanelComponent
 *
 * Approach:
 * - Verify key gameplay states rendered in the panel without coupling to unrelated page logic.
 * - Assert button enable/disable rules for turn, combat, debug, and action availability.
 * - Keep tests deterministic by stubbing gameplay services with explicit state transitions.
 */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { IActiveGame } from '@common/activeGame';
import { CombatTurnOutcome } from '@common/attackResult';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { GameActionPanelComponent } from './game-action-panel.component';

const INITIAL_TURN_TIME_LEFT_SECONDS = 12;

describe('GameActionPanelComponent', () => {
    let fixture: ComponentFixture<GameActionPanelComponent>;
    let activeGameServiceStub: {
        activeGame: IActiveGame;
        actionMode: ReturnType<typeof signal<boolean>>;
        isDebugMode: ReturnType<typeof signal<boolean>>;
        hasChangedLocation: ReturnType<typeof signal<boolean>>;
        hasAbandonned: ReturnType<typeof signal<boolean>>;
        gameHasEnded: ReturnType<typeof signal<boolean>>;
        toggleActionMode: jasmine.Spy;
        roundOutcome: CombatTurnOutcome | null;
    };
    let gameTurnServiceStub: {
        currentPlayerName: string | null;
        turnTimeLeftSeconds: ReturnType<typeof signal<number | null>>;
        isTurnPreparing: ReturnType<typeof signal<boolean>>;
        isCombatActive: ReturnType<typeof signal<boolean>>;
        canEndTurn: boolean;
        endTurn: jasmine.Spy;
    };
    let localPlayerServiceStub: { getLocalPlayer: jasmine.Spy<() => ICharacter | undefined> };

    beforeEach(async () => {
        const localPlayer = createCharacter('Alice');
        activeGameServiceStub = {
            activeGame: createActiveGame(localPlayer),
            actionMode: signal(false),
            isDebugMode: signal(false),
            hasChangedLocation: signal(false),
            hasAbandonned: signal(false),
            gameHasEnded: signal(false),
            toggleActionMode: jasmine.createSpy('toggleActionMode'),
            roundOutcome: null,
        };
        gameTurnServiceStub = {
            currentPlayerName: 'Alice',
            turnTimeLeftSeconds: signal<number | null>(INITIAL_TURN_TIME_LEFT_SECONDS),
            isTurnPreparing: signal<boolean>(false),
            isCombatActive: signal<boolean>(false),
            canEndTurn: true,
            endTurn: jasmine.createSpy('endTurn'),
        };
        localPlayerServiceStub = {
            getLocalPlayer: jasmine.createSpy('getLocalPlayer').and.returnValue(localPlayer),
        };

        await TestBed.configureTestingModule({
            imports: [GameActionPanelComponent],
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: GameTurnService, useValue: gameTurnServiceStub },
                { provide: LocalPlayerService, useValue: localPlayerServiceStub },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameActionPanelComponent);
        fixture.detectChanges();
    });

    it('should render local player identity and turn timer', () => {
        const root = fixture.nativeElement as HTMLElement;

        expect(root.textContent).toContain('Alice');
        expect(root.textContent).toContain('12s');
        expect(root.textContent).toContain('MVT: 4');
        expect(root.textContent).toContain('ACT: 1');
    });

    // Nominal case: End-turn button triggers turn service when enabled.
    it('should end turn when end-turn control is clicked and enabled', () => {
        const endTurnButton = getButtons()[0];

        endTurnButton.click();

        expect(gameTurnServiceStub.endTurn).toHaveBeenCalledTimes(1);
    });

    // Edge case: Combat state blocks end-turn/action controls.
    it('should disable turn controls during combat', () => {
        activeGameServiceStub.activeGame.currentAttack = {
            attacker: 'Alice',
            defender: 'Bob',
            attackerPosture: null,
            defenderPosture: null,
            turnCount: 1,
            suspendedTurnTimer: 0,
        };
        fixture.detectChanges();

        const actionPanel = fixture.componentInstance as unknown as GameActionPanelState;
        expect(actionPanel.canEndTurn).toBeFalse();
        expect(actionPanel.canToggleActionMode).toBeFalse();
        expect(actionPanel.isInCombat).toBeTrue();
        expect(actionPanel.combatStatus).toContain('Combat en cours');
    });

    it('should toggle action mode when action control is available', () => {
        const actionButton = getButtons()[1];

        actionButton.click();

        expect(activeGameServiceStub.toggleActionMode).toHaveBeenCalledTimes(1);
    });

    // Edge case: No remaining actions keeps action control disabled.
    it('should disable action control when local player has no actions left', () => {
        activeGameServiceStub.activeGame.players[0].actionsLeft = 0;
        fixture.detectChanges();

        const actionPanel = fixture.componentInstance as unknown as GameActionPanelState;
        expect(actionPanel.canToggleActionMode).toBeFalse();
    });

    it('should render debug badge when debug mode is enabled', () => {
        activeGameServiceStub.isDebugMode.set(true);
        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).textContent).toContain('DEBUG');
    });

    function getButtons(): HTMLButtonElement[] {
        return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'));
    }
});

interface GameActionPanelState {
    canEndTurn: boolean;
    canToggleActionMode: boolean;
    isInCombat: boolean;
    combatStatus: string;
}

function createCharacter(name: string): ICharacter {
    return {
        name,
        avatar: Avatar.Avatar1,
        initialHealth: 10,
        currentHealth: 8,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints: 4,
        attackPoints: 5,
        defensePoints: 3,
        actionsLeft: 1,
        movementLeft: 4,
        victories: 2,
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

function createActiveGame(localPlayer: ICharacter): IActiveGame {
    return {
        _id: 'game-id',
        game: {
            gameTitle: 'Arena',
            description: 'desc',
            gameMode: GameType.Classic,
            board: {
                cells: [[CellType.Empty]],
                items: [],
            },
            visibility: Visibility.Viewable,
            dateCreated: new Date(),
            lastModifiedDate: new Date(),
        },
        players: [localPlayer, createCharacter('Bob')],
        currentPlayerIndex: 0,
        turnOrder: ['Alice', 'Bob'],
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Alice',
        maxPlayerCount: 2,
        turnIsInPreparation: false,
        hasFlagId: null,
        turnStartTimeStamp: Date.now(),
        currentAttack: null,
    };
}
