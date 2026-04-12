import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AdministrationPageFacadeService } from '@app/services/admin/administration-page.facade.service';
import { IExistingGame } from '@common/game';
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
export class AdministrationPageComponent implements OnInit, OnDestroy {
    private readonly destroyRef = inject(DestroyRef);
    private readonly facade = inject(AdministrationPageFacadeService);
    protected readonly gameTableService = this.facade.gameTableService;

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

    ngOnDestroy(): void {
        this.facade.disconnectSocket();
    }

    gameIsViewable(element: IExistingGame): boolean {
        return this.facade.gameIsViewable(element);
    }

    isVisibilityToggleDisabled(element: IExistingGame): boolean {
        return this.isVisibilityTogglePending(element);
    }

    isVisibilityTogglePending(element: IExistingGame): boolean {
        return this.facade.isVisibilityTogglePending(element._id);
    }

    isVisibilityToggleLoading(element: IExistingGame, checkboxState: boolean): boolean {
        return this.facade.isVisibilityToggleLoading(element, checkboxState);
    }

    toggleVisibility(event: Event, element: IExistingGame): void {
        const input = event.target as HTMLInputElement;
        this.facade.toggleVisibility(input, element);
    }

    deleteGame(element: IExistingGame): void {
        this.facade.deleteGameAndHandleResult(element);
    }
}
