import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-form-actions',
    imports: [CommonModule],
    templateUrl: './form-actions.component.html',
})
export class FormActionsComponent {
    @Input() formValid = false;
    @Input() isLoading = false;
    @Output() randomRequested = new EventEmitter<void>();
    @Output() submitRequested = new EventEmitter<void>();

    generateRandom(): void {
        this.randomRequested.emit();
    }

    submit(): void {
        this.submitRequested.emit();
    }
}
