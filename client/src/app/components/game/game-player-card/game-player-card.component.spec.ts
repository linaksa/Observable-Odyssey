/**
 * Testing strategy — Game player card
 *
 * - Confirm header identity (avatar/name) and prominent stat tiles are rendered.
 * - Ensure secondary stats remain visible with dice shown as numeric values.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GamePlayerCardComponent } from './game-player-card.component';

describe('GamePlayerCardComponent', () => {
    let fixture: ComponentFixture<GamePlayerCardComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GamePlayerCardComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GamePlayerCardComponent);
    });

    it('renders header and key tiles with prominent values', () => {
        // Nominal case
        fixture.componentRef.setInput('player', createPlayer('Alice'));
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        expect(root.textContent).toContain('Alice');
        expect(root.textContent).toContain('Santé');
        expect(root.textContent).toContain('Mouvements');
        expect(root.textContent).toContain('Actions');
        expect(root.textContent).toContain('Victoires');
        expect(root.querySelector('[data-testid="hp-tile-value"]')?.textContent).toContain('8 / 10');
        expect(root.querySelector('[data-testid="mvt-tile-value"]')?.textContent).toContain('4');
        expect(root.querySelector('[data-testid="act-tile-value"]')?.textContent).toContain('1');
        expect(root.querySelector('[data-testid="vic-tile-value"]')?.textContent).toContain('2');
    });

    it('renders secondary stats and numeric dice values', () => {
        // Edge case
        fixture.componentRef.setInput('player', createPlayer('Bob'));
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        expect(root.textContent).toContain('ATK: 5');
        expect(root.textContent).toContain('DEF: 3');
        expect(root.textContent).toContain('RAP: 4');
        expect(root.textContent).toContain('D-ATK: 4');
        expect(root.textContent).toContain('D-DEF: 6');
    });

    it('shows fallback identity when player is missing', () => {
        fixture.componentRef.setInput('player', undefined);
        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Joueur local indisponible');
    });
});

function createPlayer(name: string): ICharacter {
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
