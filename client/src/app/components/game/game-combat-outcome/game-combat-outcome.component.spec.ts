/**
 * Testing strategy — GameCombatOutcomeComponent
 *
 * - Verify the post-combat card matches the winner/loser states from the old game.
 * - Keep observer behavior silent.
 * - Ensure the outcome clears itself after the display timeout.
 */
import { signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { IActiveGame } from '@common/activeGame';
import { CombatOutcome } from '@common/attackResult';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { GameCombatOutcomeComponent } from './game-combat-outcome.component';

const TEST_OUTCOME_AUTO_CLOSE_MS = 3000;

describe('GameCombatOutcomeComponent', () => {
    let fixture: ComponentFixture<GameCombatOutcomeComponent>;
    let activeGameServiceStub: {
        combatOutcome: ReturnType<typeof signal<CombatOutcome | null>>;
        isDebugMode: ReturnType<typeof signal<boolean>>;
    };
    let localPlayerServiceStub: jasmine.SpyObj<LocalPlayerService>;

    beforeEach(async () => {
        activeGameServiceStub = {
            combatOutcome: signal<CombatOutcome | null>(null),
            isDebugMode: signal(false),
        };
        localPlayerServiceStub = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer']);

        await TestBed.configureTestingModule({
            imports: [GameCombatOutcomeComponent],
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: LocalPlayerService, useValue: localPlayerServiceStub },
            ],
        }).compileComponents();
    });

    it('should render the victory card for a local winner and close it automatically', fakeAsync(() => {
        localPlayerServiceStub.getLocalPlayer.and.returnValue(createCharacter('Alice'));
        activeGameServiceStub.combatOutcome.set(createCombatOutcome('Alice', ['Bob'], true));

        fixture = TestBed.createComponent(GameCombatOutcomeComponent);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        expect(root.textContent).toContain('Victoire !');
        expect(root.textContent).toContain('Votre adversaire a abandonné');

        tick(TEST_OUTCOME_AUTO_CLOSE_MS);
        fixture.detectChanges();

        expect(activeGameServiceStub.combatOutcome()).toBeNull();
    }));

    it('should render the defeat card for a local loser', () => {
        localPlayerServiceStub.getLocalPlayer.and.returnValue(createCharacter('Bob'));
        activeGameServiceStub.combatOutcome.set(createCombatOutcome('Alice', ['Bob'], false));

        fixture = TestBed.createComponent(GameCombatOutcomeComponent);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        expect(root.textContent).toContain('Défaite');
        expect(root.textContent).toContain('Vainqueur');
        expect(root.textContent).toContain('Alice');
    });

    it('should stay hidden for observers', () => {
        localPlayerServiceStub.getLocalPlayer.and.returnValue(createCharacter('Charlie'));
        activeGameServiceStub.combatOutcome.set(createCombatOutcome('Alice', ['Bob'], false));

        fixture = TestBed.createComponent(GameCombatOutcomeComponent);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        expect(root.textContent?.trim()).toBe('');
        expect(root.querySelector('section')).toBeNull();
    });
});

function createCombatOutcome(winner: string | null, losers: string[], cancelled: boolean): CombatOutcome {
    return {
        updatedActiveGame: createActiveGame([createCharacter('Alice'), createCharacter('Bob')]),
        winner,
        losers,
        cancelled,
    };
}

function createActiveGame(players: ICharacter[]): IActiveGame {
    return {
        _id: 'active-game-id',
        game: {
            gameTitle: 'Arena',
            description: 'Desc',
            gameMode: GameType.Classic,
            visibility: Visibility.Viewable,
            board: {
                cells: [[CellType.Empty]],
                items: [],
            },
            dateCreated: new Date(),
            lastModifiedDate: new Date(),
        },
        players,
        currentPlayerIndex: 0,
        turnOrder: players.map((player) => player.name),
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Alice',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: null,
        turnStartTimeStamp: Date.now(),
        currentAttack: null,
    };
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
