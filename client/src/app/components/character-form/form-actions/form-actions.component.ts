import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CharacterFormService } from '@app/services/character-form.service';

@Component({
    selector: 'app-form-actions',
    imports: [CommonModule],
    templateUrl: './form-actions.component.html',
})
export class FormActionsComponent {
    protected readonly characterFormService = inject(CharacterFormService);

    @Input() isLoading = false;
    @Output() submitRequested = new EventEmitter<void>();

    generateRandom(): void {
        this.characterFormService.populateWithRandomData();
    }

    submit(): void {
        this.submitRequested.emit();
    }
}
