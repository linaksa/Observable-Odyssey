import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastComponent } from '@app/components/common/toast/toast.component';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    imports: [RouterLink, ToastComponent],
})
export class MainPageComponent {}
