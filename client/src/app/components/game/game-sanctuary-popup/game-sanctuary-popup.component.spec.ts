/**
 * Testing strategy — Game Sanctuary Popup Component
 *
 * Approach:
 * - Keep rendering checks focused on sanctuary choice actions.
 * - Verify both bonus choices stay available in popup states.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameSanctuaryPopupComponent } from './game-sanctuary-popup.component';

describe('GameSanctuaryPopupComponent', () => {
    let component: GameSanctuaryPopupComponent;
    let fixture: ComponentFixture<GameSanctuaryPopupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameSanctuaryPopupComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameSanctuaryPopupComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should render all choices when the sanctuary is available', () => {
        fixture.componentRef.setInput('data', {
            visible: true,
            title: 'Sanctuaire de combat',
            description: 'Ajoute +1 ATQ / +1 DEF, ou +2 / +2 si le 2x réussit.',
            effectLabel: 'Ajoute +1 ATQ / +1 DEF, ou +2 / +2 si le 2x réussit.',
        });
        fixture.detectChanges();

        expect(queryByTestId(fixture, 'sanctuary-standard-choice')).not.toBeNull();
        expect(queryByTestId(fixture, 'sanctuary-double-choice')).not.toBeNull();
        expect(queryByTestId(fixture, 'sanctuary-cancel-choice')).not.toBeNull();
    });

    it('should keep bonus choices visible for fight sanctuary popup states', () => {
        fixture.componentRef.setInput('data', {
            visible: true,
            title: 'Sanctuaire de combat',
            description: 'Vous avez déjà un buff de combat actif.',
            effectLabel: 'Vous ne pouvez pas obtenir un autre buff de combat tant que celui-ci est actif.',
        });
        fixture.detectChanges();

        expect(queryByTestId(fixture, 'sanctuary-standard-choice')).not.toBeNull();
        expect(queryByTestId(fixture, 'sanctuary-double-choice')).not.toBeNull();
        expect(queryByTestId(fixture, 'sanctuary-cancel-choice')).not.toBeNull();
    });
});

function queryByTestId(fixture: ComponentFixture<GameSanctuaryPopupComponent>, testId: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
}
