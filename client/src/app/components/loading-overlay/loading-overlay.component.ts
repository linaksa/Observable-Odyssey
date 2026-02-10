import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-loading-overlay',
    imports: [],
    templateUrl: './loading-overlay.component.html',
})
export class LoadingOverlayComponent {
    @Input() loadingText: string;
}
