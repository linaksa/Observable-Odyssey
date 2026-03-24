import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { EditionGameFormComponent } from '@app/components/edition/game-form/edition-game-form.component';

@Component({
    selector: 'app-edition-form-panel',
    imports: [EditionGameFormComponent],
    templateUrl: './edition-form-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'flex-1 min-w-0 min-h-0',
    },
})
export class EditionFormPanelComponent {
    readonly submitRequested = output<void>();
    readonly revertRequested = output<void>();
}
