import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { IMessage } from '@common/message';

@Component({
    selector: 'app-text-message',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [DatePipe],
    templateUrl: './text-message.component.html',
})
export class TextMessageComponent {
    readonly message = input.required<IMessage>();
    readonly isSelf = input.required<boolean>();
}
