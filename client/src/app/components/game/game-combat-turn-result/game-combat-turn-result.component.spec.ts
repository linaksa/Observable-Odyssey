/**
 * Testing strategy — GameCombatTurnResultComponent
 *
 * - Verify the label and received damage are rendered.
 * - Keep fixture values explicit and stable.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttackStats } from '@common/attackResult';
import { GameCombatTurnResultComponent } from './game-combat-turn-result.component';

const TEST_RECEIVED_DAMAGE = 3;

describe('GameCombatTurnResultComponent', () => {
    let fixture: ComponentFixture<GameCombatTurnResultComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameCombatTurnResultComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameCombatTurnResultComponent);
        fixture.componentRef.setInput('label', 'Attaquant');
        fixture.componentRef.setInput('turnStats', createAttackStats());
        fixture.componentRef.setInput('receivedDamage', TEST_RECEIVED_DAMAGE);
        fixture.detectChanges();
    });

    it('renders the provided label and damage summary', () => {
        const host = fixture.nativeElement as HTMLElement;

        expect(host.textContent).toContain('Attaquant');
        expect(host.textContent).toContain('Dégâts subis');
        expect(host.textContent).toContain(String(TEST_RECEIVED_DAMAGE));
    });
});

function createAttackStats(): AttackStats {
    return {
        baseAttackPoints: 5,
        baseDefensePoints: 4,
        attackDiceBonus: 2,
        defenseDiceBonus: 1,
        postureAttackBonus: 1,
        postureDefenseBonus: 0,
        fightSanctuaryBonus: 0,
        attackIceMalus: 0,
        defenseIceMalus: 0,
        totalAttackPoints: 8,
        totalDefensePoints: 5,
    };
}
