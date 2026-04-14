/**
 * Testing strategy — Game Player Card Component
 *
 * Approach:
 * - Keep each test focused on one rendering behavior.
 * - Validate the live stat display for fight sanctuary bonus changes.
 * - Assert the bonus styling toggles cleanly when the buff expires.
 *
 * Edge cases covered:
 * - No sanctuary bonus: the card should render the base stat normally.
 * - Active sanctuary bonus: the card should show the boosted total in green.
 * - Expired sanctuary bonus: the card should return to the base display.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GamePlayerCardComponent } from './game-player-card.component';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';

describe('GamePlayerCardComponent', () => {
    let component: GamePlayerCardComponent;
    let fixture: ComponentFixture<GamePlayerCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GamePlayerCardComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GamePlayerCardComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    // Nominal case: without a fight sanctuary bonus, affected stats should stay normal.
    it('should render the base affected stats without sanctuary bonus', () => {
        fixture.componentRef.setInput('player', createCharacter({ attackPoints: 4 }));
        fixture.detectChanges();

        const atkValue = getAttackValue(fixture);
        const defValue = getDefenseValue(fixture);

        expect(atkValue?.textContent).toContain('4');
        expect(defValue?.textContent).toContain('4');
        expect(atkValue?.classList.contains('text-green-400')).toBeFalse();
        expect(defValue?.classList.contains('text-green-400')).toBeFalse();
        expect(fixture.nativeElement.textContent).not.toContain('+1');
    });

    // Nominal case: when the bonus is active, the card should show both boosted stats in green.
    it('should render the boosted affected stats while fight sanctuary is active', () => {
        fixture.componentRef.setInput(
            'player',
            createCharacter({ attackPoints: 4, defensePoints: 4, fightSanctuaryUsed: true, fightSanctuaryBonus: 1, fightSanctuaryTurnsRemaining: 2 }),
        );
        fixture.detectChanges();

        const atkValue = getAttackValue(fixture);
        const defValue = getDefenseValue(fixture);

        expect(atkValue?.textContent).toContain('5');
        expect(defValue?.textContent).toContain('5');
        expect(atkValue?.classList.contains('text-green-400')).toBeTrue();
        expect(defValue?.classList.contains('text-green-400')).toBeTrue();
        expect(fixture.nativeElement.textContent).toContain('(+1)');
    });

    // Edge case: once the sanctuary buff expires, the display should revert to the base stats.
    it('should revert affected stat styling when fight sanctuary expires', () => {
        fixture.componentRef.setInput(
            'player',
            createCharacter({ attackPoints: 4, defensePoints: 4, fightSanctuaryUsed: true, fightSanctuaryBonus: 1, fightSanctuaryTurnsRemaining: 2 }),
        );
        fixture.detectChanges();

        fixture.componentRef.setInput(
            'player',
            createCharacter({ attackPoints: 4, defensePoints: 4, fightSanctuaryBonus: 0, fightSanctuaryTurnsRemaining: 0 }),
        );
        fixture.detectChanges();

        const atkValue = getAttackValue(fixture);
        const defValue = getDefenseValue(fixture);

        expect(atkValue?.textContent).toContain('4');
        expect(defValue?.textContent).toContain('4');
        expect(atkValue?.classList.contains('text-green-400')).toBeFalse();
        expect(defValue?.classList.contains('text-green-400')).toBeFalse();
        expect(fixture.nativeElement.textContent).not.toContain('(+1)');
    });
});

function getAttackValue(fixture: ComponentFixture<GamePlayerCardComponent>): HTMLElement | null {
    return fixture.nativeElement.querySelector('[data-testid="atk-tile-value"]');
}

function getDefenseValue(fixture: ComponentFixture<GamePlayerCardComponent>): HTMLElement | null {
    return fixture.nativeElement.querySelector('[data-testid="def-tile-value"]');
}

function createCharacter(overrides: Partial<ICharacter> = {}): ICharacter {
    return {
        name: 'Alice',
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
        fightSanctuaryUsed: false,
        fightSanctuaryTurnsRemaining: 0,
        fightSanctuaryBonus: 0,
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
        ...overrides,
    };
}
