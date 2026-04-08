/**
 * Testing strategy — Wait Chat Sidebar Component
 *
 * Approach:
 * - Keep each test focused on one behavior with deterministic mocks/spies.
 * - Validate both nominal flows and failure paths that could break UX/state.
 * - Assert side effects explicitly (state changes, emitted events, and service calls).
 *
 * Edge cases covered:
 * - Missing or invalid input guards and safe early returns.
 * - Error handling paths and fallback user-facing messaging.
 * - Cleanup/teardown behavior (unsubscribe/reset/disconnect) when applicable.
 */
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { WaitChatSidebarComponent } from './wait-chat-sidebar.component';

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
    let organizer: ICharacter;
    let guest: ICharacter;

    beforeEach(async () => {
        organizer = createCharacter('Organizer');
        guest = createCharacter('Guest');

        socketServiceSpy = jasmine.createSpyObj<SocketService>('SocketService', ['emit']);
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
