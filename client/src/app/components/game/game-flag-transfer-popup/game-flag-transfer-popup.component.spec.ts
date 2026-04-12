import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SocketEvent } from '@common/socket-events';
import { GameFlagTransferPopupComponent } from './game-flag-transfer-popup.component';

describe('GameFlagTransferPopupComponent', () => {
    let fixture: ComponentFixture<GameFlagTransferPopupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameFlagTransferPopupComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameFlagTransferPopupComponent);
    });

    it('should render accept and reject buttons when local player can respond', () => {
        fixture.componentRef.setInput('request', createRequest(true));
        fixture.detectChanges();

        expect(queryByTestId(fixture, 'flag-transfer-accept')).not.toBeNull();
        expect(queryByTestId(fixture, 'flag-transfer-reject')).not.toBeNull();
    });

    it('should hide decision buttons while requester is waiting', () => {
        fixture.componentRef.setInput('request', createRequest(false));
        fixture.detectChanges();

        expect(queryByTestId(fixture, 'flag-transfer-accept')).toBeNull();
        expect(queryByTestId(fixture, 'flag-transfer-reject')).toBeNull();
        expect(fixture.nativeElement.textContent).toContain('Veuillez patienter');
    });

    function createRequest(canRespond: boolean) {
        return {
            data: {
                gameId: 'game-1',
                currentPlayerName: 'Alice',
                currentPlayerActionsLeft: 0,
                targetPlayerName: 'Bob',
            },
            acceptEvent: SocketEvent.TakeFlag,
            question: canRespond ? 'Alice veut prendre votre drapeau. Voulez-vous le lui donner ?' : 'En attente de la décision de Bob.',
            canRespond,
        };
    }
});

function queryByTestId(fixture: ComponentFixture<GameFlagTransferPopupComponent>, testId: string): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="${testId}"]`);
}
