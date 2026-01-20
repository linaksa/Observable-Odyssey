import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
    selector: 'app-wait-page',
    imports: [MatProgressSpinnerModule],
    templateUrl: './wait-page.component.html',
    styleUrl: './wait-page.component.scss',
})
export class WaitPageComponent {}
