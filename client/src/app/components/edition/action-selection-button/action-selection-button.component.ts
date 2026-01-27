import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-action-selection-button',
  imports: [],
  styleUrl: './action-selection-button.component.scss',
  template: `
    <button type="button"
            [attr.title]="tooltip"
      class="px-3 py-2 w-full rounded border text-center"
                        [class.bg-blue-500]="isSelected"
                        [class.text-white]="isSelected"
                        [class.hover:bg-gray-100]="!isSelected"
                >
      <ng-content></ng-content>
    </button>
                `,
})
export class ActionSelectionButtonComponent {
  @Input() isSelected: boolean = false;
  @Input() tooltip?: string;
}
