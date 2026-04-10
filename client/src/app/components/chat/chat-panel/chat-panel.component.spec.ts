/**
 * Testing strategy — ChatPanelComponent
 *
 * - Verify chat connection starts when an active game is present.
 * - Ensure invalid (whitespace-only) submissions are rejected.
 */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { ChatService } from '@app/services/realtime/chat.service';
import { ChatPanelComponent } from './chat-panel.component';

describe('ChatPanelComponent', () => {
    let fixture: ComponentFixture<ChatPanelComponent>;
    let component: ChatPanelComponent;
    const chatServiceStub = {
        connect: jasmine.createSpy('connect'),
        sendMessage: jasmine.createSpy('sendMessage'),
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ChatPanelComponent],
            providers: [
                {
                    provide: ActiveGameService,
                    useValue: {
                        isLoading: signal(false),
                        activeGame: { _id: 'active-game-id', messages: [] },
                    },
                },
                {
                    provide: LocalPlayerService,
                    useValue: {
                        getLocalPlayer: jasmine.createSpy('getLocalPlayer').and.returnValue({ name: 'Alice' }),
                    },
                },
                { provide: ChatService, useValue: chatServiceStub },
            ],
        }).compileComponents();

        chatServiceStub.connect.calls.reset();
        chatServiceStub.sendMessage.calls.reset();
        fixture = TestBed.createComponent(ChatPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('connects chat when active game is available', () => {
        expect(chatServiceStub.connect).toHaveBeenCalled();
    });

    it('does not send invalid whitespace-only messages', () => {
        component.messageForm.setValue({ message: '   ' });

        component.onNewMessage();

        expect(chatServiceStub.sendMessage).not.toHaveBeenCalled();
    });
});
