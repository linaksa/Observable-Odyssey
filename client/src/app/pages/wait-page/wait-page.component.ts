import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AppMaterialModule } from '@app/modules/material.module';

@Component({
    selector: 'app-wait-page',
    imports: [AppMaterialModule, MatProgressSpinnerModule],
    templateUrl: './wait-page.component.html',
    styleUrl: './wait-page.component.scss',
})
export class WaitPageComponent {
    timeToShowButtonMs: number = 3000;
    showButton: boolean = false;

    constructor(private router: Router) {
        setTimeout(() => (this.showButton = true), this.timeToShowButtonMs);
    }

    goHome(): void {
        this.router.navigateByUrl('/home');
    }
}
