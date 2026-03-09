import { AfterViewChecked, Component, effect, ElementRef, inject, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TextMessageComponent } from '@app/components/text-message/text-message.component';
import { ActiveGameService } from '@app/services/active-game.service';
import { ChatService } from '@app/services/chat.service';
import { LocalPlayerService } from '@app/services/local-player.service';

@Component({
    selector: 'app-chat-panel',
    imports: [TextMessageComponent, ReactiveFormsModule],
    templateUrl: './chat-panel.component.html',
})
export class ChatPanelComponent implements AfterViewChecked {
    private readonly autoScrollBoundary = 80;
    private readonly maxMessageLength = 200;
    private readonly minMessageLength = 1;
    private readonly invalidSubmissionFeedbackDuration = 2000;

    private readonly chatService = inject(ChatService);
    protected readonly activeGameService = inject(ActiveGameService);
    protected readonly localPlayerService = inject(LocalPlayerService);
    @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
    messageForm: FormGroup;

    invalidSubmission = signal(false);

    constructor(private fb: FormBuilder) {
        this.messageForm = this.fb.group({
            message: ['', [Validators.required, Validators.maxLength(this.maxMessageLength), Validators.minLength(this.minMessageLength)]],
        });

        effect(() => {
            if (!this.activeGameService.isLoading() && this.activeGameService.activeGame?._id) {
                this.chatService.connect();
            }
        });
    }

    onNewMessage() {
        if (this.messageForm.invalid) {
            this.invalidSubmission.set(true);
            setTimeout(() => this.invalidSubmission.set(false), this.invalidSubmissionFeedbackDuration);
            return;
        }

        this.chatService.sendMessage(this.messageForm.value.message);
        this.messageForm.reset();
    }

    private lastMessageCount = 0;

    ngAfterViewChecked() {
        const count = this.activeGameService.activeGame.messages.length;

        if (count !== this.lastMessageCount) {
            this.scrollToBottom();
            this.lastMessageCount = count;
        }
    }

    private scrollToBottom() {
        const el = this.scrollContainer.nativeElement;

        const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < this.autoScrollBoundary;

        if (isNearBottom) {
            el.scrollTop = el.scrollHeight;
        }
    }
}
