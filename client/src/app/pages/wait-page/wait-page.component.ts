import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { AppMaterialModule } from '@app/modules/material.module';

@Component({
    selector: 'app-wait-page',
    imports: [AppMaterialModule, MatProgressSpinnerModule, RouterLink],
    templateUrl: './wait-page.component.html',
    styleUrl: './wait-page.component.scss',
})
export class WaitPageComponent {
    timeToShowButtonMs: number = 3000;
    showButton: boolean = false;

    constructor() {
        setTimeout(() => (this.showButton = true), this.timeToShowButtonMs);
    }
}
