/**
 * Testing strategy — Chat Pannel Component
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
import { Component, ElementRef, Input, WritableSignal, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { ChatService } from '@app/services/realtime/chat.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';
import { IMessage } from '@common/message';
import { ChatPanelComponent } from './chat-pannel.component';

@Component({
    selector: 'app-text-message',
    template: '',
})
class MockTextMessageComponent {
    @Input() message!: IMessage;
    @Input() isSelf = false;
}

const INVALID_FEEDBACK_DURATION_MS = 2000;
const SCROLL_HEIGHT = 500;
const NEAR_BOTTOM_SCROLL_TOP = 430;
const FAR_SCROLL_TOP = 200;
const SCROLL_CLIENT_HEIGHT = 50;

describe('ChatPanelComponent', () => {
    let component: ChatPanelComponent;
    let fixture: ComponentFixture<ChatPanelComponent>;
    let chatServiceSpy: jasmine.SpyObj<ChatService>;
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let activeGameServiceStub: {
        isLoading: WritableSignal<boolean>;
        activeGame: IActiveGame;
    };

    beforeEach(async () => {
        chatServiceSpy = jasmine.createSpyObj<ChatService>('ChatService', ['connect', 'sendMessage']);
        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer']);
        localPlayerServiceSpy.getLocalPlayer.and.returnValue({ name: 'Alice' } as unknown as ICharacter);

        activeGameServiceStub = {
            isLoading: signal(false),
            activeGame: createActiveGame('active-game-1'),
        };

        TestBed.overrideComponent(ChatPanelComponent, {
            set: {
                imports: [ReactiveFormsModule, MockTextMessageComponent],
            },
        });

        await TestBed.configureTestingModule({
            imports: [ChatPanelComponent],
            providers: [
                { provide: ChatService, useValue: chatServiceSpy },
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
            ],
        }).compileComponents();
    });

    const createComponent = () => {
        fixture = TestBed.createComponent(ChatPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    };

    it('should connect chat when game is ready', () => {
        createComponent();

        expect(chatServiceSpy.connect).toHaveBeenCalled();
    });

    it('should connect chat only after loading completes', () => {
        activeGameServiceStub.isLoading.set(true);
        createComponent();

        expect(chatServiceSpy.connect).not.toHaveBeenCalled();

        activeGameServiceStub.isLoading.set(false);
        fixture.detectChanges();

        expect(chatServiceSpy.connect).toHaveBeenCalledTimes(1);
    });

    it('should send trimmed message and reset form when submission is valid', () => {
        createComponent();

        component.messageForm.get('message')?.setValue('   Salut tout le monde   ');
        component.onNewMessage();

        expect(chatServiceSpy.sendMessage).toHaveBeenCalledWith('Salut tout le monde');
        expect(component.messageForm.get('message')?.value).toBeNull();
    });

    // Edge case: should flag invalid submission for whitespace-only messages.
    it('should flag invalid submission for whitespace-only messages', fakeAsync(() => {
        createComponent();

        component.messageForm.get('message')?.setValue('   ');
        component.onNewMessage();

        expect(component.invalidSubmission()).toBeTrue();
        expect(chatServiceSpy.sendMessage).not.toHaveBeenCalled();

        tick(INVALID_FEEDBACK_DURATION_MS);
        expect(component.invalidSubmission()).toBeFalse();
    }));

    it('should auto-scroll only when message count changes', () => {
        createComponent();
        const privateApi = component as unknown as { scrollToBottom: () => void };
        const scrollSpy = spyOn(privateApi, 'scrollToBottom');

        component.ngAfterViewChecked();
        expect(scrollSpy).not.toHaveBeenCalled();

        activeGameServiceStub.activeGame.messages.push(createMessage('Bob', 'Nouveau message'));
        component.ngAfterViewChecked();
        component.ngAfterViewChecked();

        expect(scrollSpy).toHaveBeenCalledTimes(1);
    });

    it('should only force scroll when user is near bottom', () => {
        createComponent();
        const privateApi = component as unknown as {
            scrollContainer: ElementRef<{ scrollHeight: number; scrollTop: number; clientHeight: number }>;
            scrollToBottom: () => void;
        };

        const nearBottomElement = {
            scrollHeight: SCROLL_HEIGHT,
            scrollTop: NEAR_BOTTOM_SCROLL_TOP,
            clientHeight: SCROLL_CLIENT_HEIGHT,
        };
        privateApi.scrollContainer = new ElementRef(nearBottomElement);
        privateApi.scrollToBottom();
        expect(nearBottomElement.scrollTop).toBe(SCROLL_HEIGHT);

        const farFromBottomElement = {
            scrollHeight: SCROLL_HEIGHT,
            scrollTop: FAR_SCROLL_TOP,
            clientHeight: SCROLL_CLIENT_HEIGHT,
        };
        privateApi.scrollContainer = new ElementRef(farFromBottomElement);
        privateApi.scrollToBottom();
        expect(farFromBottomElement.scrollTop).toBe(FAR_SCROLL_TOP);
    });
});

function createActiveGame(id: string): IActiveGame {
    return {
        _id: id,
        messages: [],
    } as unknown as IActiveGame;
}

function createMessage(author: string, content: string): IMessage {
    return {
        author,
        content,
        postedAt: new Date('2026-01-01T00:00:00.000Z'),
    };
}
