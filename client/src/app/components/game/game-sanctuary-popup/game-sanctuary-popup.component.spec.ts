/**
 * Testing strategy — Game Sanctuary Popup Component
 *
 * Approach:
 * - Keep rendering checks focused on sanctuary choice actions.
 * - Verify both bonus choices stay available in popup states.
 *
 * Edge cases covered:
 * - Fight sanctuary states should still show both bonus choices and cancel action.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameSanctuaryPopupComponent } from '@app/components/game/game-sanctuary-popup/game-sanctuary-popup.component';
import { HUNDRED_PERCENT, MILLISECONDS_PER_SECOND, TURN_TIME_MS } from '@common/constants';

const TEN_SECONDS = 10;
const FLOATING_PRECISION = 8;

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
        // Nominal case: available sanctuary exposes both bonus choices and cancel action.
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
        // Edge case: already-buffed sanctuary state still renders both selectable choices.
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

    it('should compute timer percent for null and positive time values', () => {
        // Edge case: null turn time falls back to zero progress.
        fixture.componentRef.setInput('data', {
            visible: true,
            title: 'Sanctuary',
            description: 'desc',
            effectLabel: 'effect',
        });
        fixture.componentRef.setInput('turnTimeLeftSeconds', null);
        fixture.detectChanges();
        expect(component['turnTimerPercent']()).toBe(0);

        // Nominal case: valid turn time yields deterministic ratio-based progress.
        fixture.componentRef.setInput('turnTimeLeftSeconds', TEN_SECONDS);
        fixture.detectChanges();

        const expected = (TEN_SECONDS / (TURN_TIME_MS / MILLISECONDS_PER_SECOND)) * HUNDRED_PERCENT;
        expect(component['turnTimerPercent']()).toBeCloseTo(expected, FLOATING_PRECISION);
    });
});

function queryByTestId(fixture: ComponentFixture<GameSanctuaryPopupComponent>, testId: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
}
