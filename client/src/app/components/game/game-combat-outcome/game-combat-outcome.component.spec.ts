/**
 * Testing strategy — Game Combat Outcome Component
 *
 * Approach:
 * - Validate outcome visibility rules for winner/loser/spectator contexts using local-player service stubs.
 * - Exercise manual close, auto-close timeout, and teardown paths to verify deterministic cleanup side effects.
 *
 * Edge cases covered:
 * - Missing local player or unrelated spectator contexts should hide outcomes.
 * - Manual close, destroy hooks, and timeout expiry should all clear outcome state safely.
 */
import { signal } from '@angular/core';
import { fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { GameCombatOutcomeComponent } from '@app/components/game/game-combat-outcome/game-combat-outcome.component';
import { GAME_COMBAT_OUTCOME_AUTO_CLOSE_MS } from '@app/constants/gameplay';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { IActiveGame } from '@common/active-game';
import { CombatOutcome } from '@common/attack-result';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';

describe('GameCombatOutcomeComponent', () => {
    let activeGameServiceStub: {
        combatOutcome: ReturnType<typeof signal<CombatOutcome | null>>;
        isDebugMode: ReturnType<typeof signal<boolean>>;
    };
    let localPlayerServiceSpy: jasmine.SpyObj<Pick<LocalPlayerService, 'getLocalPlayer'>>;

    beforeEach(async () => {
        activeGameServiceStub = {
            combatOutcome: signal(null),
            isDebugMode: signal(false),
        };

        localPlayerServiceSpy = jasmine.createSpyObj<Pick<LocalPlayerService, 'getLocalPlayer'>>('LocalPlayerService', ['getLocalPlayer']);
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Alice'));

        await TestBed.configureTestingModule({
            imports: [GameCombatOutcomeComponent],
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
            ],
        }).compileComponents();
    });

    it('shows outcome only to winner or loser, not spectators', () => {
        // Nominal case: only winner/loser participants can see the combat outcome.
        const fixture = TestBed.createComponent(GameCombatOutcomeComponent);
        const component = fixture.componentInstance as unknown as {
            visibleOutcome: () => CombatOutcome | null;
            isWinner: (outcome: CombatOutcome) => boolean;
            isLoser: (outcome: CombatOutcome) => boolean;
        };

        const aliceWins = createOutcome('Alice', ['Bob']);
        activeGameServiceStub.combatOutcome.set(aliceWins);
        fixture.detectChanges();

        expect(component.visibleOutcome()).toEqual(aliceWins);
        expect(component.isWinner(aliceWins)).toBeTrue();
        expect(component.isLoser(aliceWins)).toBeFalse();

        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Bob'));
        const loserFixture = TestBed.createComponent(GameCombatOutcomeComponent);
        const loserComponent = loserFixture.componentInstance as unknown as {
            visibleOutcome: () => CombatOutcome | null;
            isWinner: (outcome: CombatOutcome) => boolean;
            isLoser: (outcome: CombatOutcome) => boolean;
        };
        loserFixture.detectChanges();
        expect(loserComponent.visibleOutcome()).toEqual(aliceWins);
        expect(loserComponent.isWinner(aliceWins)).toBeFalse();
        expect(loserComponent.isLoser(aliceWins)).toBeTrue();
        loserFixture.destroy();

        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Carol'));
        const spectatorFixture = TestBed.createComponent(GameCombatOutcomeComponent);
        const spectatorComponent = spectatorFixture.componentInstance as unknown as {
            visibleOutcome: () => CombatOutcome | null;
        };
        spectatorFixture.detectChanges();
        expect(spectatorComponent.visibleOutcome()).toBeNull();
        spectatorFixture.destroy();
    });

    it('returns null visible outcome when no local player is known', () => {
        // Edge case: without a local player, the component hides combat outcomes.
        const fixture = TestBed.createComponent(GameCombatOutcomeComponent);
        const component = fixture.componentInstance as unknown as { visibleOutcome: () => CombatOutcome | null };

        activeGameServiceStub.combatOutcome.set(createOutcome('Alice', ['Bob']));
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);
        fixture.detectChanges();

        expect(component.visibleOutcome()).toBeNull();
    });

    it('returns null visible outcome when local player is not part of the combat', () => {
        const fixture = TestBed.createComponent(GameCombatOutcomeComponent);
        const component = fixture.componentInstance as unknown as { visibleOutcome: () => CombatOutcome | null };

        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Alice'));
        activeGameServiceStub.combatOutcome.set(createOutcome('Carol', ['Dave']));
        fixture.detectChanges();

        expect(component.visibleOutcome()).toBeNull();
    });

    it('closes outcome manually and on destroy', () => {
        const fixture = TestBed.createComponent(GameCombatOutcomeComponent);
        const component = fixture.componentInstance as unknown as {
            closeOutcome: () => void;
            ngOnDestroy: () => void;
        };

        activeGameServiceStub.combatOutcome.set(createOutcome('Alice', ['Bob']));
        fixture.detectChanges();

        component.closeOutcome();
        expect(activeGameServiceStub.combatOutcome()).toBeNull();

        activeGameServiceStub.combatOutcome.set(createOutcome('Alice', ['Bob']));
        component.ngOnDestroy();
        expect(activeGameServiceStub.combatOutcome()).toBeNull();
    });

    it('auto-closes visible outcome after timeout', fakeAsync(() => {
        const fixture = TestBed.createComponent(GameCombatOutcomeComponent);
        fixture.detectChanges();

        activeGameServiceStub.combatOutcome.set(createOutcome('Alice', ['Bob']));
        fixture.detectChanges();
        expect(activeGameServiceStub.combatOutcome()).not.toBeNull();

        tick(GAME_COMBAT_OUTCOME_AUTO_CLOSE_MS - 1);
        expect(activeGameServiceStub.combatOutcome()).not.toBeNull();

        tick(1);
        expect(activeGameServiceStub.combatOutcome()).toBeNull();
        flush();
    }));
});

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

function createOutcome(winner: string | null, losers: string[]): CombatOutcome {
    return {
        updatedActiveGame: createActiveGame(),
        winner,
        losers,
        cancelled: false,
    };
}

function createActiveGame(): IActiveGame {
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
        players: [],
        currentPlayerIndex: 0,
        turnOrder: [],
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
