import { AfterViewChecked, Component, effect, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TextMessageComponent } from '@app/components/chat/text-message/text-message.component';
import {
    CHAT_PANEL_AUTO_SCROLL_BOUNDARY_PX,
    CHAT_PANEL_INVALID_SUBMISSION_FEEDBACK_DURATION_MS,
    CHAT_PANEL_MAX_MESSAGE_LENGTH,
    CHAT_PANEL_MIN_MESSAGE_LENGTH,
} from '@app/constants/chat';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { ChatService } from '@app/services/realtime/chat.service';

@Component({
    selector: 'app-chat-panel',
    imports: [TextMessageComponent, ReactiveFormsModule],
    templateUrl: './chat-panel.component.html',
})
export class ChatPanelComponent implements AfterViewChecked {
    private readonly chatService = inject(ChatService);
    protected readonly activeGameService = inject(ActiveGameService);
    protected readonly localPlayerService = inject(LocalPlayerService);
    protected readonly maxMessageLength = CHAT_PANEL_MAX_MESSAGE_LENGTH;
    private connectedGameId?: string;

    @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
    messageForm: FormGroup;

    invalidSubmission = signal(false);

    constructor(private fb: FormBuilder) {
        this.messageForm = this.fb.group({
            message: [
                '',
                [
                    Validators.required,
                    Validators.maxLength(CHAT_PANEL_MAX_MESSAGE_LENGTH),
                    (control: AbstractControl) => {
                        return control.value?.trim().length >= CHAT_PANEL_MIN_MESSAGE_LENGTH ? null : { whitespace: true };
                    },
                ],
            ],
        });

        effect(() => {
            if (this.activeGameService.isLoading()) {
                return;
            }

            const activeGameId = this.activeGameService.activeGame?._id;
            if (!activeGameId || this.connectedGameId === activeGameId) {
                return;
            }

            this.connectedGameId = activeGameId;
            this.chatService.connect();
        });
    }

    onNewMessage() {
        if (this.messageForm.invalid) {
            this.invalidSubmission.set(true);
            setTimeout(() => this.invalidSubmission.set(false), CHAT_PANEL_INVALID_SUBMISSION_FEEDBACK_DURATION_MS);
            return;
        }

        this.chatService.sendMessage(this.messageForm.value.message.trim());
        this.messageForm.reset();
    }

    private lastMessageCount = 0;
    private shouldStickToBottom = true;

    ngAfterViewChecked() {
        const count = this.activeGameService.chatMessages().length;

        if (count !== this.lastMessageCount) {
            if (this.shouldStickToBottom) {
                this.scrollToBottom();
            }
            this.lastMessageCount = count;
        }
    }

    protected onScroll(): void {
        const element = this.scrollContainer?.nativeElement;
        if (!element) {
            return;
        }

        this.shouldStickToBottom = this.isNearBottom(element);
    }

    private scrollToBottom() {
        const el = this.scrollContainer.nativeElement;
        el.scrollTop = el.scrollHeight;
        requestAnimationFrame(() => {
            el.scrollTop = el.scrollHeight;
            requestAnimationFrame(() => {
                el.scrollTop = el.scrollHeight;
            });
        });
    }

    private isNearBottom(element: HTMLElement): boolean {
        const distanceFromBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
        return distanceFromBottom <= CHAT_PANEL_AUTO_SCROLL_BOUNDARY_PX;
    }
}
