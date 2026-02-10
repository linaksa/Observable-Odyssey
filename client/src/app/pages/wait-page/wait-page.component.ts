import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoadingOverlayComponent } from '@app/components/loading-overlay/loading-overlay.component';

@Component({
    selector: 'app-wait-page',
    imports: [LoadingOverlayComponent, RouterLink],
    templateUrl: './wait-page.component.html',
})
export class WaitPageComponent {
    timeout: number = 0;
    showButton: boolean = false;

    constructor() {
        setTimeout(() => (this.showButton = true), this.timeout);
    }
}
