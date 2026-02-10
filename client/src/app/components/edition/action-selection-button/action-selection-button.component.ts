import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-action-selection-button',
  imports: [],
    template: `
        <button
            type="button"
            [attr.title]="tooltip"
            class="px-3 py-2 w-full rounded border text-center transition"
            [disabled]="disabled"
            [class.bg-blue-500]="isSelected && !disabled"
            [class.text-white]="isSelected && !disabled"
            [class.hover:bg-gray-100]="!isSelected && !disabled"
            [class.bg-gray-200]="disabled"
            [class.text-gray-400]="disabled"
            [class.cursor-not-allowed]="disabled"
        >
            <ng-content></ng-content>
        </button>
    `,
})
export class ActionSelectionButtonComponent {
  @Input() isSelected: boolean = false;
  @Input() tooltip?: string;
  @Input() disabled = false;
}
