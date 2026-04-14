import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { EditorGameFormComponent } from '@app/components/editor/game-form/editor-game-form.component';

@Component({
    selector: 'app-editor-form-panel',
    imports: [EditorGameFormComponent],
    templateUrl: './editor-form-panel.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'flex-1 min-w-0 min-h-0',
    },
})
export class EditorFormPanelComponent {
    readonly submitRequested = output<void>();
    readonly revertRequested = output<void>();
}
