import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { GameTableComponent } from '@app/components/common/game-table/game-table.component';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { ToastComponent } from '@app/components/common/toast/toast.component';
import { GameCreationDialogComponent } from '@app/components/game-creation-dialog/game-creation-dialog.component';
import { AdminSocketService } from '@app/services/admin.socket.service';
import { AdministrationService } from '@app/services/administration.service';
import { GameTableService } from '@app/services/game-table.service';
import { GameService } from '@app/services/game.service';
import { ToastService } from '@app/services/toast.service';
import { IExistingGame, Visibility } from '@common/game';
import { finalize } from 'rxjs';

@Component({
    selector: 'app-administration-page',
    imports: [CommonModule, GameTableComponent, RouterLink, GameCreationDialogComponent, NavButtonsComponent, PageTitleComponent, ToastComponent],
    templateUrl: './administration-page.component.html',
})
export class AdministrationPageComponent implements OnInit {
    private readonly destroyRef = inject(DestroyRef);

    private readonly adminService = inject(AdministrationService);
    private readonly gameService = inject(GameService);
    private readonly toastService = inject(ToastService);
    private readonly adminSocketService = inject(AdminSocketService);

    protected readonly gameTableService = inject(GameTableService);
    private readonly pendingVisibilityToggles = signal(new Set<string>());

    isDialogOpen = false;

    openDialog(): void {
        this.isDialogOpen = true;
    }

    closeDialog(): void {
        this.isDialogOpen = false;
    }

    ngOnInit(): void {
        this.gameTableService.tableData = [];
        this.fetchCorrectGames();

        this.adminSocketService.connect();
        this.adminSocketService
            .onGamesModified()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.fetchCorrectGames(),
                error: (error: HttpErrorResponse) =>
                    this.toastService.show(this.getServerMessage(error, "Il y a eu un problème lors de l'ajout des jeux.")),
            });
    }

    private fetchCorrectGames(): void {
        this.gameTableService.fetchGames(false);
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

        this.adminService
            .changeGameVisibility(element._id, input.checked)
            .pipe(
                finalize(() => {
                    this.updateVisibilityTogglePending(element._id, false);
                }),
            )
            .subscribe({
                next: () => this.gameTableService.fetchGames(false),
                error: () => {
                    input.checked = !input.checked;
                    this.toastService.show('Il y a eu un problème lors du changement de visibilité.');
                },
            });
    }

    deleteGame(element: IExistingGame): void {
        this.gameService.deleteGame(element).subscribe({
            next: () => {
                this.gameTableService.tableData = this.gameTableService.tableData.filter((item) => item._id !== element._id);
            },
            error: (error: HttpErrorResponse) =>
                this.toastService.show(this.getServerMessage(error, 'Il y a eu un problème lors de la suppression.')),
        });
    }

    private getServerMessage(error: HttpErrorResponse, fallback: string): string {
        return error?.error?.error || fallback;
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
