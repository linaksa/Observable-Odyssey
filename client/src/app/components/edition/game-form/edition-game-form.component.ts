import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MAX_DESCRIPTION_LENGTH, MAX_TITLE_LENGTH } from '@common/constants';
import { GameEditFormService } from '@app/services/forms/game-edit-form.service';

@Component({
    selector: 'app-edition-game-form',
    imports: [ReactiveFormsModule],
    templateUrl: './edition-game-form.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        class: 'flex w-full flex-col min-h-0',
    },
})
export class EditionGameFormComponent {
    protected readonly gameEditFormService = inject(GameEditFormService);
    protected readonly maxTitleLength = MAX_TITLE_LENGTH;
    protected readonly maxDescriptionLength = MAX_DESCRIPTION_LENGTH;

    readonly submitRequested = output<void>();
    readonly revertRequested = output<void>();
}
