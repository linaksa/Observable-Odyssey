/**
 * Testing strategy — ChatPanelComponent
 *
 * - Verify chat connection starts when an active game is present.
 * - Ensure rendered messages follow the reactive chat signal.
 * - Ensure invalid (whitespace-only) submissions are rejected.
 */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { ChatService } from '@app/services/realtime/chat.service';
import { IMessage } from '@common/message';
import { ChatPanelComponent } from './chat-panel.component';

describe('ChatPanelComponent', () => {
    let fixture: ComponentFixture<ChatPanelComponent>;
    let component: ChatPanelComponent;
    const activeGameServiceStub = {
        isLoading: signal(false),
        activeGame: { _id: 'active-game-id', messages: [] as unknown[] },
        chatMessages: signal<IMessage[]>([]),
    };
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
                    useValue: activeGameServiceStub,
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
        activeGameServiceStub.isLoading.set(false);
        activeGameServiceStub.activeGame.messages = [];
        activeGameServiceStub.chatMessages.set([]);
        fixture = TestBed.createComponent(ChatPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('connects chat when active game is available', () => {
        expect(chatServiceStub.connect).toHaveBeenCalled();
    });

    it('renders new messages when the chat signal updates', () => {
        activeGameServiceStub.chatMessages.set([createMessage('Alice', 'Bonjour')]);
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('Alice');
        expect(fixture.nativeElement.textContent).toContain('Bonjour');
    });

    it('does not send invalid whitespace-only messages', () => {
        component.messageForm.setValue({ message: '   ' });

        component.onNewMessage();

        expect(chatServiceStub.sendMessage).not.toHaveBeenCalled();
    });
});

function createMessage(author: string, content: string): IMessage {
    return {
        author,
        content,
        postedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
}
