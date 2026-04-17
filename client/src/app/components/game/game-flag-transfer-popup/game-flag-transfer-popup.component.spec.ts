/**
 * Testing strategy — Game Flag Transfer Popup Component
 *
 * Approach:
 * - Validate primary rendering states by toggling transfer request permissions.
 * - Keep assertions focused on decision button visibility and accept-label wording.
 *
 * Edge cases covered:
 * - Waiting states (cannot respond) should hide both decision buttons.
 * - Give-flag requests should switch the accept label to the takeover wording.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SocketEvent } from '@common/socket-events';
import { HUNDRED_PERCENT, MILLISECONDS_PER_SECOND, TURN_TIME_MS } from '@common/constants';
import { GameFlagTransferPopupComponent } from '@app/components/game/game-flag-transfer-popup/game-flag-transfer-popup.component';

const TEN_SECONDS = 10;
const FLOATING_PRECISION = 8;

describe('GameFlagTransferPopupComponent', () => {
    let fixture: ComponentFixture<GameFlagTransferPopupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameFlagTransferPopupComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameFlagTransferPopupComponent);
    });

    it('should render accept and reject buttons when local player can respond', () => {
        // Nominal case: responders see both accept and reject actions.
        fixture.componentRef.setInput('request', createRequest(true));
        fixture.detectChanges();

        expect(queryByTestId(fixture, 'flag-transfer-accept')).not.toBeNull();
        expect(queryByTestId(fixture, 'flag-transfer-reject')).not.toBeNull();
    });

    it('should hide decision buttons while requester is waiting', () => {
        // Edge case: non-responders only see the waiting message.
        fixture.componentRef.setInput('request', createRequest(false));
        fixture.detectChanges();

        expect(queryByTestId(fixture, 'flag-transfer-accept')).toBeNull();
        expect(queryByTestId(fixture, 'flag-transfer-reject')).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Veuillez patienter');
    });

    it('should show "Prendre le drapeau" when current player wants to give the flag', () => {
        // Edge case: give-flag flow customizes accept wording.
        fixture.componentRef.setInput('request', createRequest(true, SocketEvent.GiveFlag));
        fixture.detectChanges();

        const acceptButton = queryByTestId(fixture, 'flag-transfer-accept');
        expect(acceptButton?.textContent).toContain('Prendre le drapeau');
    });

    it('should use null-request fallback values for computed helpers', () => {
        // Edge case: without a request payload, computed helpers must return safe defaults.
        const component = fixture.componentInstance;
        fixture.componentRef.setInput('request', null);
        fixture.detectChanges();

        expect(component['isVisible']()).toBeFalse();
        expect(component['canRespond']()).toBeFalse();
        expect(component['question']()).toBe('');
        expect(component['acceptButtonLabel']()).not.toContain('Prendre le drapeau');
    });

    it('should compute positive turn timer percent when time is provided', () => {
        // Nominal case: explicit turn time maps to a stable percentage value.
        const component = fixture.componentInstance;
        fixture.componentRef.setInput('request', createRequest(true));
        fixture.componentRef.setInput('turnTimeLeftSeconds', TEN_SECONDS);
        fixture.detectChanges();

        const expected = (TEN_SECONDS / (TURN_TIME_MS / MILLISECONDS_PER_SECOND)) * HUNDRED_PERCENT;
        expect(component['turnTimerPercent']()).toBeCloseTo(expected, FLOATING_PRECISION);
    });

    function createRequest(canRespond: boolean, acceptEvent: SocketEvent.TakeFlag | SocketEvent.GiveFlag = SocketEvent.TakeFlag) {
        return {
            data: {
                gameId: 'game-1',
                currentPlayerName: 'Alice',
                currentPlayerActionsLeft: 0,
                targetPlayerName: 'Bob',
            },
            acceptEvent,
            question: canRespond ? 'Alice veut prendre votre drapeau. Voulez-vous le lui donner ?' : 'En attente de la décision de Bob.',
            canRespond,
        };
    }
});

function queryByTestId(fixture: ComponentFixture<GameFlagTransferPopupComponent>, testId: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
}
