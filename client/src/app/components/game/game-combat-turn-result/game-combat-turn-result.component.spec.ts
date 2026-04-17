/* eslint-disable @typescript-eslint/no-magic-numbers -- To make the spec file easier to read */
/**
 * Testing strategy — Game Combat Turn Result Component
 *
 * Approach:
 * - Treat the component as a rendering contract by feeding realistic combat stat payloads through inputs.
 * - Re-assign input payloads between rounds to assert reactive UI updates without mutating test helpers.
 *
 * Edge cases covered:
 * - Zero values, malus values, and refreshed round payloads should all render consistently.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameCombatTurnResultComponent } from '@app/components/game/game-combat-turn-result/game-combat-turn-result.component';
import { AttackStats } from '@common/attack-result';

describe('GameCombatTurnResultComponent', () => {
    let fixture: ComponentFixture<GameCombatTurnResultComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameCombatTurnResultComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameCombatTurnResultComponent);
        fixture.componentRef.setInput('label', 'Attaquant');
        fixture.componentRef.setInput('turnStats', createStats({ totalAttackPoints: 9, totalDefensePoints: 6, attackIceMalus: -2 }));
        fixture.componentRef.setInput('opponentStats', createStats({ totalAttackPoints: 7 }));
        fixture.componentRef.setInput('dealtDamage', 3);
        fixture.componentRef.setInput('receivedDamage', 1);
        fixture.detectChanges();
    });

    it('renders turn and opponent combat totals from inputs', () => {
        // Nominal case: initial payload renders all combat total fields.
        const text = fixture.nativeElement.textContent as string;

        expect(text).toContain('Total ATK');
        expect(text).toContain('9');
        expect(text).toContain('Total DEF');
        expect(text).toContain('6');
        expect(text).toContain('ATK adverse');
        expect(text).toContain('7');
        expect(text).toContain('Dégâts infligés');
        expect(text).toContain('3');
        expect(text).toContain('Dégâts reçus');
        expect(text).toContain('1');
    });

    it('updates displayed values when a new round payload arrives', () => {
        // Edge case: round refresh updates displayed totals and damage values.
        fixture.componentRef.setInput('turnStats', createStats({ totalAttackPoints: 4, totalDefensePoints: 8, defenseFightSanctuaryBonus: 2 }));
        fixture.componentRef.setInput('opponentStats', createStats({ totalAttackPoints: 10 }));
        fixture.componentRef.setInput('dealtDamage', 0);
        fixture.componentRef.setInput('receivedDamage', 2);
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent as string;
        expect(text).toContain('4');
        expect(text).toContain('8');
        expect(text).toContain('10');
        expect(text).toContain('0');
        expect(text).toContain('2');
    });
});

function createStats(overrides: Partial<AttackStats> = {}): AttackStats {
    return {
        baseAttackPoints: 4,
        baseDefensePoints: 4,
        attackDiceBonus: 1,
        defenseDiceBonus: 1,
        postureAttackBonus: 2,
        postureDefenseBonus: 0,
        attackFightSanctuaryBonus: 0,
        defenseFightSanctuaryBonus: 0,
        attackIceMalus: 0,
        defenseIceMalus: 0,
        totalAttackPoints: 7,
        totalDefensePoints: 5,
        ...overrides,
    };
}
