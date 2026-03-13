import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-attribute-display',
    imports: [CommonModule],
    templateUrl: './attribute-display.component.html',
})
export class AttributeDisplayComponent {
    @Input() name: string;
    @Input() value: number | string;
    @Input() bgColor: string;
}
