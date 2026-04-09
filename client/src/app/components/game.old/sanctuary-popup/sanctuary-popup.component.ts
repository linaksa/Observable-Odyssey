import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { SanctuaryChoice, SanctuaryPopupData } from '@common/info';

@Component({
    selector: 'app-sanctuary-popup',
    imports: [CommonModule],
    templateUrl: './sanctuary-popup.component.html',
})
export class SanctuaryPopupComponent {
    data = input.required<SanctuaryPopupData>();
    choiceSelected = output<SanctuaryChoice>();
    cancel = output<void>();
}
