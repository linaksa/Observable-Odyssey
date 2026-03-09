import { Component, inject } from '@angular/core';
import { ToastService } from '@app/services/toast.service';

@Component({
    selector: 'app-toast',
    imports: [],
    templateUrl: './toast.component.html',
})
export class ToastComponent {
    protected readonly toastService = inject(ToastService);
}
