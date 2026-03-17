import { DatePipe, NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';
import { IMessage } from '@common/message';

@Component({
    selector: 'app-text-message',
    imports: [NgClass, DatePipe],
    templateUrl: './text-message.component.html',
})
export class TextMessageComponent {
    @Input({ required: true }) message: IMessage;
    @Input({ required: true }) isSelf: boolean;
}
