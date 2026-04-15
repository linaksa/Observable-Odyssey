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

    it('should show "Prendre le drapeau" when current player wants to give the flag', () => {
        fixture.componentRef.setInput('request', createRequest(true, SocketEvent.GiveFlag));
        fixture.detectChanges();

        const acceptButton = queryByTestId(fixture, 'flag-transfer-accept');
        expect(acceptButton?.textContent).toContain('Prendre le drapeau');
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
