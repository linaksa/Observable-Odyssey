import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdministrationPageFacadeService } from '@app/services/admin/administration-page.facade.service';
import { IExistingGame, Visibility } from '@common/game';
import { finalize } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GameCreationDialogComponent } from '@app/components/admin/game-creation-dialog/game-creation-dialog.component';
import { GameTableComponent } from '@app/components/common/game-table/game-table.component';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { ToastComponent } from '@app/components/common/toast/toast.component';

@Component({
    selector: 'app-administration-page',
    imports: [CommonModule, GameTableComponent, RouterLink, GameCreationDialogComponent, NavButtonsComponent, PageTitleComponent, ToastComponent],
    templateUrl: './administration-page.component.html',
})
export class AdministrationPageComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);
    private readonly facade = inject(AdministrationPageFacadeService);
    protected readonly gameTableService = this.facade.gameTableService;
    private readonly pendingVisibilityToggles = signal(new Set<string>());

    isDialogOpen = false;

    openDialog(): void {
        this.isDialogOpen = true;
    }

    closeDialog(): void {
        this.isDialogOpen = false;
    }

    ngOnInit(): void {
        this.facade.initializePageData();

        this.facade
            .onGamesModified()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.facade.fetchGames(),
                error: (error: HttpErrorResponse) => this.facade.showServerMessage(error, "Il y a eu un problème lors de l'ajout des jeux."),
            });

        this.facade.connectSocket();
    }

    gameIsViewable(element: IExistingGame): boolean {
        return element.visibility === Visibility.Viewable;
    }

    isVisibilityToggleDisabled(element: IExistingGame): boolean {
        return this.isVisibilityTogglePending(element);
    }

    isVisibilityTogglePending(element: IExistingGame): boolean {
        return this.pendingVisibilityToggles().has(element._id);
    }

    isVisibilityToggleLoading(element: IExistingGame, checkboxState: boolean): boolean {
        return this.isVisibilityTogglePending(element) || checkboxState !== this.gameIsViewable(element);
    }

    toggleVisibility(event: Event, element: IExistingGame): void {
        const input = event.target as HTMLInputElement;

        if (this.isVisibilityToggleDisabled(element)) {
            return;
        }
        this.updateVisibilityTogglePending(element._id, true);

        this.facade
            .changeGameVisibility(element._id, input.checked)
            .pipe(
                finalize(() => {
                    this.updateVisibilityTogglePending(element._id, false);
                }),
            )
            .subscribe({
                next: () => this.facade.fetchGames(),
                error: (error: HttpErrorResponse) => {
                    input.checked = !input.checked;
                    this.facade.showServerMessage(error, 'Il y a eu un problème lors du changement de visibilité.');
                },
            });
    }

    deleteGame(element: IExistingGame): void {
        this.facade.deleteGame(element).subscribe({
            next: () => {
                this.facade.removeDeletedGameFromTable(element._id);
            },
            error: (error: HttpErrorResponse) => this.facade.showServerMessage(error, 'Il y a eu un problème lors de la suppression.'),
        });
    }

    private updateVisibilityTogglePending(gameId: string, isPending: boolean): void {
        this.pendingVisibilityToggles.update((currentSet) => {
            const nextSet = new Set(currentSet);
            if (isPending) {
                nextSet.add(gameId);
            } else {
                nextSet.delete(gameId);
            }

            return nextSet;
        });
    }
}
