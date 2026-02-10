import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-wait-page',
    imports: [MatProgressSpinnerModule, RouterLink],
    templateUrl: './wait-page.component.html',
})
export class WaitPageComponent {
    timeToShowButtonMs: number = 3000;
    showButton: boolean = false;

    constructor() {
        setTimeout(() => (this.showButton = true), this.timeToShowButtonMs);
    }
}
