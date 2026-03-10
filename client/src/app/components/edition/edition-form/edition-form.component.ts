import { Component, inject, Input, OnInit, Signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { GameEditFormService } from '@app/services/game-edit-form.service';

import { CellType } from '@common/board';
import { IExistingGame } from '@common/game';
import { IItem } from '@common/items';

@Component({
    selector: 'app-edition-form',
    imports: [ReactiveFormsModule],
    templateUrl: './edition-form.component.html',
})
export class EditionFormComponent implements OnInit {
    protected readonly gameEditFormService = inject(GameEditFormService);
    private readonly router = inject(Router);

    isSubmittingFlag: Signal<boolean> = this.gameEditFormService.isSubmitting.asReadonly();

    @Input() game: IExistingGame;
    @Input() cells: CellType[][];
    @Input() objects: IItem[];
    @Input() gridSelector: HTMLElement | null;

    ngOnInit(): void {
        this.gameEditFormService.init(this.game);
    }

    submitGameForm(): void {
        this.gameEditFormService
            .submitForm(this.game._id, this.game.gameMode, this.cells, this.objects, this.gridSelector)
            .then(() => {
                this.router.navigate(['/admin']);
            })
            .catch(() => {
                // The service handles error display on its own
            });
    }

    resetForm(game: IExistingGame): void {
        this.gameEditFormService.resetForm(game);
    }
}
