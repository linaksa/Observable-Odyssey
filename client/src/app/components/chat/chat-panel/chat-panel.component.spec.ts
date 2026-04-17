/**
 * Testing strategy — Chat Panel Component
 *
 * Approach:
 * - Override the template and validate class behavior with deterministic signal-based service stubs.
 * - Cover connection lifecycle, message validation/submission, and auto-scroll behavior.
 *
 * Edge cases covered:
 * - Loading or duplicate active game id should not reconnect.
 * - Invalid whitespace submission should show temporary feedback.
 * - Missing scroll container and non-bottom scroll position should avoid forced scrolling.
 */
import { ElementRef, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CHAT_PANEL_INVALID_SUBMISSION_FEEDBACK_DURATION_MS, CHAT_PANEL_MAX_MESSAGE_LENGTH } from '@app/constants/chat';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { ChatService } from '@app/services/realtime/chat.service';
import { IMessage } from '@common/message';
import { ChatPanelComponent } from './chat-panel.component';

const EXPECTED_SCROLL_BOTTOM = 320;
const UNCHANGED_SCROLL_TOP = 11;

describe('ChatPanelComponent', () => {
    let component: ChatPanelComponent;
    let fixture: ComponentFixture<ChatPanelComponent>;
    let chatServiceSpy: jasmine.SpyObj<ChatService>;
    let activeGameServiceStub: {
        isLoading: ReturnType<typeof signal<boolean>>;
        activeGame?: { _id: string };
        chatMessages: ReturnType<typeof signal<IMessage[]>>;
    };

    beforeEach(async () => {
        chatServiceSpy = jasmine.createSpyObj<ChatService>('ChatService', ['connect', 'sendMessage']);
        activeGameServiceStub = {
            isLoading: signal(true),
            activeGame: { _id: 'game-1' },
            chatMessages: signal<IMessage[]>([]),
        };

        TestBed.overrideComponent(ChatPanelComponent, { set: { template: '' } });

        await TestBed.configureTestingModule({
            imports: [ChatPanelComponent],
            providers: [
                { provide: ChatService, useValue: chatServiceSpy },
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: LocalPlayerService, useValue: {} as LocalPlayerService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ChatPanelComponent);
        component = fixture.componentInstance;
    });

    it('should connect once per active game id when loading completes', () => {
        // Nominal case: first transition to loaded connects chat socket.
        activeGameServiceStub.isLoading.set(false);
        fixture.detectChanges();

        expect(chatServiceSpy.connect).toHaveBeenCalledTimes(1);

        // Edge case: same game id should not reconnect.
        activeGameServiceStub.isLoading.set(true);
        activeGameServiceStub.isLoading.set(false);
        fixture.detectChanges();

        expect(chatServiceSpy.connect).toHaveBeenCalledTimes(1);

        activeGameServiceStub.activeGame = { _id: 'game-2' };
        activeGameServiceStub.isLoading.set(true);
        // Edge case: while loading is true, reconnect must stay blocked.
        fixture.detectChanges();
        expect(chatServiceSpy.connect).toHaveBeenCalledTimes(1);

        activeGameServiceStub.isLoading.set(false);
        fixture.detectChanges();

        expect(chatServiceSpy.connect).toHaveBeenCalledTimes(2);
    });

    it('should reject invalid messages and clear feedback after timeout', fakeAsync(() => {
        component.messageForm.get('message')?.setValue('   ');

        component.onNewMessage();

        expect(component.invalidSubmission()).toBeTrue();
        expect(chatServiceSpy.sendMessage).not.toHaveBeenCalled();

        tick(CHAT_PANEL_INVALID_SUBMISSION_FEEDBACK_DURATION_MS);

        expect(component.invalidSubmission()).toBeFalse();
    }));

    it('should send trimmed valid message and reset form', () => {
        component.messageForm.get('message')?.setValue(` ${'a'.repeat(CHAT_PANEL_MAX_MESSAGE_LENGTH - 2)} `);

        component.onNewMessage();

        expect(chatServiceSpy.sendMessage).toHaveBeenCalledWith('a'.repeat(CHAT_PANEL_MAX_MESSAGE_LENGTH - 2));
        expect(component.messageForm.get('message')?.value).toBeNull();
    });

    it('should auto-scroll only when message count changes and user is near bottom', () => {
        spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
            callback(0);
            return 0;
        });

        const element = {
            scrollTop: 0,
            scrollHeight: 320,
            clientHeight: 260,
        } as HTMLElement;
        (component as unknown as { scrollContainer: ElementRef<HTMLElement> }).scrollContainer = {
            nativeElement: element,
        } as ElementRef<HTMLElement>;

        activeGameServiceStub.chatMessages.set([{ author: 'Alice', content: 'Hi', postedAt: new Date() }]);
        component.ngAfterViewChecked();

        expect(element.scrollTop).toBe(EXPECTED_SCROLL_BOTTOM);

        // Edge case: unchanged message count should not force scrolling.
        element.scrollTop = UNCHANGED_SCROLL_TOP;
        component.ngAfterViewChecked();
        expect(element.scrollTop).toBe(UNCHANGED_SCROLL_TOP);
    });

    it('should not auto-scroll when user has scrolled away from the bottom', () => {
        const element = {
            scrollTop: 0,
            scrollHeight: 500,
            clientHeight: 100,
        } as HTMLElement;
        (component as unknown as { scrollContainer: ElementRef<HTMLElement> }).scrollContainer = {
            nativeElement: element,
        } as ElementRef<HTMLElement>;

        (component as unknown as { onScroll: () => void }).onScroll();

        activeGameServiceStub.chatMessages.set([{ author: 'Bob', content: 'Away', postedAt: new Date() }]);
        component.ngAfterViewChecked();

        expect(element.scrollTop).toBe(0);
    });

    it('should ignore scroll updates when the container is unavailable', () => {
        (component as unknown as { scrollContainer?: ElementRef<HTMLElement> }).scrollContainer = undefined;

        expect(() => (component as unknown as { onScroll: () => void }).onScroll()).not.toThrow();
    });
});
