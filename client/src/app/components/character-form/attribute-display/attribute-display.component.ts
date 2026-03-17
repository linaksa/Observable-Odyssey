import { NgClass } from '@angular/common';
import { Component, input } from '@angular/core';

@Component({
    selector: 'app-attribute-display',
    imports: [NgClass],
    templateUrl: './attribute-display.component.html',
})
export class AttributeDisplayComponent {
    name = input.required<string>();
    value = input.required<number | string>();
    bgColor = input.required<string>();
}
