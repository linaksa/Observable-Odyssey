import { Component, input, InputSignal, output, OutputEmitterRef } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-nav-buttons',
    imports: [RouterLink],
    templateUrl: './nav-buttons.component.html',
})
export class NavButtonsComponent {
    readonly showBack: InputSignal<boolean> = input<boolean>(true);
    readonly linkBack: InputSignal<string> = input<string>('/home');
    readonly textBack: InputSignal<string> = input<string>('Retour vers la vue initiale');

    readonly showAction: InputSignal<boolean> = input<boolean>(false);
    readonly textAction: InputSignal<string> = input<string>('');

    readonly action: OutputEmitterRef<void> = output<void>();
}
