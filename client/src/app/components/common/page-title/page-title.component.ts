import { Component, input, InputSignal } from '@angular/core';

@Component({
    selector: 'app-page-title',
    imports: [],
    templateUrl: './page-title.component.html',
})
export class PageTitleComponent {
    readonly title: InputSignal<string> = input.required<string>();
}
