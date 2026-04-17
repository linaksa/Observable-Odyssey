/**
 * Testing strategy — Wait Chat Sidebar Component
 *
 * Approach:
 * - Model organizer/guest lobby states to validate derived permissions for starting the game.
 * - Assert `startGame` socket emissions with exact namespace, event, and active-game payload.
 * - Feed server error events through the socket stream and verify the rendered waiting-room feedback.
 *
 * Edge cases covered:
 * - Lobbies with fewer than two players keep start actions disabled.
 * - Missing active game ids prevent start emissions entirely.
 * - Rejected start requests surface the localized "minimum players" error text.
 */
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/active-game';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { ErrorCode, IErrorResponse } from '@common/error-codes';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Observable, Subject } from 'rxjs';
import { WaitChatSidebarComponent } from '@app/components/wait/wait-chat-sidebar/wait-chat-sidebar.component';

@Component({
    selector: 'app-chat-panel',
    template: '',
})
class MockChatPanelComponent {}

describe('WaitChatSidebarComponent', () => {
    let component: WaitChatSidebarComponent;
    let fixture: ComponentFixture<WaitChatSidebarComponent>;
    let socketServiceSpy: jasmine.SpyObj<SocketService>;
    let activeGameServiceStub: { activeGame: IActiveGame };
    let startGameError$: Subject<IErrorResponse>;
    let organizer: ICharacter;
    let guest: ICharacter;

    beforeEach(async () => {
        organizer = createCharacter('Organizer');
        guest = createCharacter('Guest');

        socketServiceSpy = jasmine.createSpyObj<SocketService>('SocketService', ['emit', 'on']);
        startGameError$ = new Subject<IErrorResponse>();
        socketServiceSpy.on.and.callFake(<T>(_namespace: string, event: string): Observable<T> => {
            if (event === SocketEvent.StartGameError) {
                return startGameError$.asObservable() as Observable<T>;
            }

            return new Subject<T>().asObservable();
        });
        activeGameServiceStub = {
            activeGame: {
                _id: 'active-game-1',
                players: [organizer, guest],
                organizerName: organizer.name,
            } as unknown as IActiveGame,
        };

        TestBed.overrideComponent(WaitChatSidebarComponent, {
            set: { imports: [CommonModule, MockChatPanelComponent] },
        });

        await TestBed.configureTestingModule({
            imports: [WaitChatSidebarComponent],
            providers: [
                { provide: SocketService, useValue: socketServiceSpy },
                { provide: ActiveGameService, useValue: activeGameServiceStub },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(WaitChatSidebarComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('localPlayer', organizer);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should disable start when fewer than two players are present', () => {
        activeGameServiceStub.activeGame.players = [organizer];
        expect(component.isStartDisabled).toBeTrue();

        activeGameServiceStub.activeGame.players = [organizer, guest];
        expect(component.isStartDisabled).toBeFalse();
    });

    it('should allow game start only for organizer local player', () => {
        fixture.componentRef.setInput('localPlayer', organizer);
        fixture.detectChanges();
        expect(component.canStartGame).toBeTrue();

        fixture.componentRef.setInput('localPlayer', guest);
        fixture.detectChanges();
        expect(component.canStartGame).toBeFalse();
    });

    it('should emit start-game event when game id exists', () => {
        activeGameServiceStub.activeGame._id = 'active-game-1';

        component.startGame();

        expect(socketServiceSpy.emit).toHaveBeenCalledWith(Namespaces.Game, SocketEvent.StartGame, 'active-game-1');
    });

    // Edge case: When game id is missing, it should not emit start-game event.
    it('should not emit start-game event when game id is missing', () => {
        activeGameServiceStub.activeGame._id = '';

        component.startGame();

        expect(socketServiceSpy.emit).not.toHaveBeenCalled();
    });

    it('should show the start-game error message when the server rejects the start request', () => {
        startGameError$.next({ errorCodes: [ErrorCode.StartGameRequiresAtLeastTwoPlayers] });
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('La partie doit contenir au moins deux joueurs.');
    });
});

function createCharacter(name: string): ICharacter {
    return {
        name,
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

        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}
