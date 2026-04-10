/* eslint-disable @typescript-eslint/no-magic-numbers -- test fixture values */
/**
 * Testing strategy — GameCombatPopupComponent
 *
 * - Verify participant vs observer rendering for active combat.
 * - Assert combat posture selection and confirmation wiring.
 * - Cover combat result rendering once the round outcome is available.
 */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { IActiveGame, ICurrentAttack } from '@common/activeGame';
import { AttackPosture, AttackStats, CombatTurnOutcome } from '@common/attackResult';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { GameCombatPopupComponent } from './game-combat-popup.component';

describe('GameCombatPopupComponent', () => {
    let fixture: ComponentFixture<GameCombatPopupComponent>;
    let activeGameServiceStub: {
        activeGame: IActiveGame;
        roundOutcome: ReturnType<typeof signal<CombatTurnOutcome | null>>;
        chooseAttackMode: jasmine.Spy;
        getPlayerByName: jasmine.Spy<(name: string) => ICharacter | undefined>;
    };
    let gameTurnServiceStub: {
        isCombatActive: ReturnType<typeof signal<boolean>>;
        combatTimeLeftSeconds: ReturnType<typeof signal<number | null>>;
    };
    let localPlayerServiceStub: jasmine.SpyObj<LocalPlayerService>;

    beforeEach(async () => {
        const attacker = createCharacter('Alice');
        const defender = createCharacter('Bob');

        activeGameServiceStub = {
            activeGame: createActiveGame([attacker, defender]),
            roundOutcome: signal<CombatTurnOutcome | null>(null),
            chooseAttackMode: jasmine.createSpy('chooseAttackMode'),
            getPlayerByName: jasmine
                .createSpy('getPlayerByName')
                .and.callFake((name: string) => activeGameServiceStub.activeGame.players.find((player) => player.name === name)),
        };
        gameTurnServiceStub = {
            isCombatActive: signal(false),
            combatTimeLeftSeconds: signal<number | null>(null),
        };
        localPlayerServiceStub = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer']);
        localPlayerServiceStub.getLocalPlayer.and.returnValue(attacker);

        await TestBed.configureTestingModule({
            imports: [GameCombatPopupComponent],
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: GameTurnService, useValue: gameTurnServiceStub },
                { provide: LocalPlayerService, useValue: localPlayerServiceStub },
            ],
        }).compileComponents();
    });

    // Nominal case: A local combat participant can choose a posture and confirm it.
    it('renders participant controls and confirms the selected posture', () => {
        activeGameServiceStub.activeGame.currentAttack = createAttack('Alice', 'Bob');
        gameTurnServiceStub.isCombatActive.set(true);
        gameTurnServiceStub.combatTimeLeftSeconds.set(8);

        fixture = TestBed.createComponent(GameCombatPopupComponent);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        const buttons = getButtons(fixture);

        expect(root.textContent).toContain('Alice vs Bob');
        expect(root.textContent).toContain('8s');
        expect(root.textContent).toContain('Défensif');
        expect(root.textContent).toContain('Offensif');
        expect(root.textContent).toContain('HP 8 / 10');
        expect(root.textContent).not.toContain('MVT:');
        expect(root.textContent).not.toContain('ACT:');
        expect(root.textContent).not.toContain('ATK:');
        expect(root.textContent).not.toContain('DEF:');
        expect(root.textContent).not.toContain('RAP:');
        expect(root.textContent).not.toContain('VIC:');

        buttons.find((button) => button.textContent?.includes('Défensif'))?.click();
        fixture.detectChanges();
        expect(root.textContent).toContain('Confirmer');

        getButtons(fixture)
            .find((button) => button.textContent?.includes('Confirmer'))
            ?.click();

        expect(activeGameServiceStub.chooseAttackMode).toHaveBeenCalledWith(AttackPosture.Defensive);
    });

    // Edge case: Observers only see the combat summary, not the participant controls.
    it('renders an observer summary without combat controls', () => {
        localPlayerServiceStub.getLocalPlayer.and.returnValue(createCharacter('Charlie'));
        activeGameServiceStub.activeGame.currentAttack = createAttack('Alice', 'Bob');
        gameTurnServiceStub.isCombatActive.set(true);
        gameTurnServiceStub.combatTimeLeftSeconds.set(6);

        fixture = TestBed.createComponent(GameCombatPopupComponent);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;

        expect(root.textContent).toContain('Alice affronte Bob.');
        expect(root.textContent).not.toContain('Confirmer');
        expect(root.textContent).not.toContain('Défensif');
        expect(root.textContent).not.toContain('Offensif');
    });

    // Nominal case: Combat result cards appear once the round outcome is available.
    it('renders combat turn results for participants', () => {
        activeGameServiceStub.activeGame.currentAttack = createAttack('Alice', 'Bob');
        activeGameServiceStub.roundOutcome.set(createCombatOutcome());
        gameTurnServiceStub.isCombatActive.set(true);
        gameTurnServiceStub.combatTimeLeftSeconds.set(null);

        fixture = TestBed.createComponent(GameCombatPopupComponent);
        fixture.detectChanges();

        expect(fixture.debugElement.queryAll(By.css('app-game-combat-turn-result')).length).toBe(2);
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Dégâts subis');
    });

    // Edge case: The result still appears when the combat timer expires before the postures are resolved.
    it('renders combat turn results when the round outcome arrives after timeout', () => {
        activeGameServiceStub.activeGame.currentAttack = createAttack('Alice', 'Bob');
        gameTurnServiceStub.isCombatActive.set(true);
        gameTurnServiceStub.combatTimeLeftSeconds.set(null);

        fixture = TestBed.createComponent(GameCombatPopupComponent);
        fixture.detectChanges();

        expect(fixture.debugElement.queryAll(By.css('app-game-combat-turn-result')).length).toBe(0);

        activeGameServiceStub.roundOutcome.set(createCombatOutcome());
        fixture.detectChanges();

        expect(fixture.debugElement.queryAll(By.css('app-game-combat-turn-result')).length).toBe(2);
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Dégâts subis');
    });
});

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

function createActiveGame(players: ICharacter[]): IActiveGame {
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
        players,
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

function createAttack(attacker: string, defender: string): ICurrentAttack {
    return {
        attacker,
        defender,
        turnCount: 1,
        suspendedTurnTimer: 3,
        attackerPosture: null,
        defenderPosture: null,
    };
}

function createCombatOutcome(): CombatTurnOutcome {
    return {
        updatedActiveGame: createActiveGame([createCharacter('Alice'), createCharacter('Bob')]),
        attackerStats: createAttackStats(5, 4, 1),
        defenderStats: createAttackStats(4, 5, 2),
        attackerReceivedDamage: 2,
        defenderReceivedDamage: 3,
    };
}

function createAttackStats(baseAttackPoints: number, baseDefensePoints: number, postureAttackBonus: number): AttackStats {
    return {
        baseAttackPoints,
        baseDefensePoints,
        attackDiceBonus: 2,
        defenseDiceBonus: 1,
        postureAttackBonus,
        postureDefenseBonus: 0,
        fightSanctuaryBonus: 0,
        attackIceMalus: 0,
        defenseIceMalus: 0,
        totalAttackPoints: baseAttackPoints + 2 + postureAttackBonus,
        totalDefensePoints: baseDefensePoints + 1,
    };
}

function getButtons(fixture: ComponentFixture<GameCombatPopupComponent>): HTMLButtonElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('button'));
}
