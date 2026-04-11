/* eslint-disable @typescript-eslint/no-magic-numbers -- test fixture values */
/**
 * Testing strategy — GameCombatPopupComponent
 *
 * - Verify the restored combat-mode shell renders inside the grid panel.
 * - Hide the side result boxes until combat results are available.
 * - Assert posture selection and confirmation still wire through current logic.
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
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let gameTurnServiceStub: {
        isCombatActive: ReturnType<typeof signal<boolean>>;
        combatTimeLeftSeconds: ReturnType<typeof signal<number | null>>;
    };

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
        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer']);
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(attacker);
        gameTurnServiceStub = {
            isCombatActive: signal(false),
            combatTimeLeftSeconds: signal<number | null>(null),
        };

        await TestBed.configureTestingModule({
            imports: [GameCombatPopupComponent],
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: GameTurnService, useValue: gameTurnServiceStub },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
            ],
        }).compileComponents();
    });

    // Nominal case: The combat shell keeps both side cards in place until results exist.
    it('renders the combat shell with hidden side result cards before outcomes exist', () => {
        activeGameServiceStub.activeGame.currentAttack = createAttack('Alice', 'Bob');
        gameTurnServiceStub.isCombatActive.set(true);
        gameTurnServiceStub.combatTimeLeftSeconds.set(8);

        fixture = TestBed.createComponent(GameCombatPopupComponent);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        const outerDiv = root.querySelector('.absolute') as HTMLElement | null;
        const panel = root.querySelector('.combat-panel') as HTMLElement | null;
        const comparisonRow = root.querySelector('.combat-comparison') as HTMLElement | null;
        const actionsGrid = root.querySelector('.combat-actions') as HTMLElement | null;
        const actionButtons = root.querySelectorAll('.combat-actions > button');

        expect(outerDiv).toBeTruthy();
        expect(outerDiv?.classList.contains('fixed')).toBeFalse();
        expect(outerDiv?.classList.contains('absolute')).toBeTrue();
        expect(outerDiv?.classList.contains('p-4')).toBeTrue();
        expect(outerDiv?.classList.contains('overflow-y-auto')).toBeTrue();
        expect(outerDiv?.classList.contains('bg-black/70')).toBeTrue();
        expect(outerDiv?.classList.contains('backdrop-blur-sm')).toBeTrue();

        expect(panel).toBeTruthy();
        expect(comparisonRow).toBeTruthy();
        expect(actionsGrid).toBeTruthy();
        expect(actionButtons.length).toBe(2);
        const actionButtonsTopDelta = Math.abs(actionButtons[0].getBoundingClientRect().top - actionButtons[1].getBoundingClientRect().top);

        expect(actionButtonsTopDelta).toBeLessThan(1);
        expect(root.textContent).toContain('Défenseur');
        expect(root.textContent).toContain('Attaquant');
        expect(root.textContent).toContain('Alice');
        expect(root.textContent).toContain('Bob');
        expect(root.textContent).toContain('8s');
        expect(root.textContent).toContain('Choisir une action');
        expect(root.textContent).toContain('VS');
        expect(root.querySelectorAll('aside').length).toBe(2);
        expect(root.querySelectorAll('.combat-side-card').length).toBe(2);
        expect(root.querySelectorAll('.combat-side-card.invisible').length).toBe(2);
        expect(actionButtons[0]).toBeInstanceOf(HTMLButtonElement);
        expect(actionButtons[1]).toBeInstanceOf(HTMLButtonElement);
        expect((actionButtons[0] as HTMLButtonElement).disabled).toBeFalse();
        expect((actionButtons[1] as HTMLButtonElement).disabled).toBeFalse();
        expect(root.querySelectorAll('button').length).toBe(2);
    });

    it('shows the compact combat summary for spectators', () => {
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Carol'));
        activeGameServiceStub.activeGame.currentAttack = createAttack('Alice', 'Bob');
        gameTurnServiceStub.isCombatActive.set(true);
        gameTurnServiceStub.combatTimeLeftSeconds.set(6);

        fixture = TestBed.createComponent(GameCombatPopupComponent);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;

        expect(root.textContent).toContain('Combat en cours');
        expect(root.textContent).toContain('Alice');
        expect(root.textContent).toContain('Bob');
        expect(root.textContent).toContain('6s');
        expect(root.textContent).toContain('détails complets');
        expect(root.textContent).not.toContain('HP');
        expect(root.textContent).not.toContain('Choisir une action');
        expect(root.querySelectorAll('button').length).toBe(0);
        expect(root.querySelectorAll('.combat-side-card').length).toBe(0);
    });

    // Nominal case: Selecting a posture and confirming it still routes through current combat logic.
    it('keeps the selected posture checked and locks the action buttons after confirmation', () => {
        activeGameServiceStub.activeGame.currentAttack = createAttack('Alice', 'Bob');
        gameTurnServiceStub.isCombatActive.set(true);
        gameTurnServiceStub.combatTimeLeftSeconds.set(8);

        fixture = TestBed.createComponent(GameCombatPopupComponent);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        const chooseButtons = Array.from(root.querySelectorAll('button')) as HTMLButtonElement[];

        chooseButtons.find((button) => button.textContent?.includes('Défensif'))?.click();
        fixture.detectChanges();

        expect(root.textContent).toContain('Mode défensif sélectionné...');
        expect(root.textContent).toContain('Confirmer');

        const confirmButton = Array.from(root.querySelectorAll('button')).find((button) => button.textContent?.includes('Confirmer')) as
            | HTMLButtonElement
            | undefined;
        expect(confirmButton).toBeTruthy();

        confirmButton?.click();
        expect(activeGameServiceStub.chooseAttackMode).toHaveBeenCalledWith(AttackPosture.Defensive);
        fixture.detectChanges();

        expect(root.textContent).toContain('Posture défensive adoptée !');
        expect(root.textContent).toContain('✓');
        expect(root.textContent).toContain('Défensif');
        expect(root.textContent).not.toContain('Confirmer');
        expect((Array.from(root.querySelectorAll('.combat-actions > button'))[0] as HTMLButtonElement).disabled).toBeTrue();
        expect((Array.from(root.querySelectorAll('.combat-actions > button'))[1] as HTMLButtonElement).disabled).toBeTrue();
    });

    // Nominal case: The popup includes both restored side stats cards when results are available.
    it('renders the restored side stats cards', () => {
        activeGameServiceStub.activeGame.currentAttack = createAttack('Alice', 'Bob');
        activeGameServiceStub.roundOutcome = signal<CombatTurnOutcome | null>(createCombatOutcome());
        gameTurnServiceStub.isCombatActive.set(true);

        fixture = TestBed.createComponent(GameCombatPopupComponent);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        const actionButtons = root.querySelectorAll('.combat-actions > button');

        expect(fixture.debugElement.queryAll(By.css('app-game-combat-turn-result')).length).toBe(2);
        expect(root.querySelectorAll('.combat-side-card.invisible').length).toBe(0);
        expect(actionButtons.length).toBe(2);
        expect((actionButtons[0] as HTMLButtonElement).disabled).toBeTrue();
        expect((actionButtons[1] as HTMLButtonElement).disabled).toBeTrue();
        expect(root.textContent).toContain('Attaque');
        expect(root.textContent).toContain('Défense');
        expect(root.textContent).toContain('Dégâts subis');
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
