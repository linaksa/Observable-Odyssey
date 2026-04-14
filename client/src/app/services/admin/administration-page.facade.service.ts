import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { AdministrationService } from '@app/services/admin/administration.service';
import { GameService } from '@app/services/admin/game.service';
import { AdminSocketService } from '@app/services/realtime/admin.socket.service';
import { GameTableService } from '@app/services/tables/game-table.service';
import { ToastService } from '@app/services/ui/toast.service';
import { extractErrorCodes, mapErrorCodesToMessage } from '@app/utils/error-codes';
import { IExistingGame, Visibility } from '@common/game';
import { finalize, Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class AdministrationPageFacadeService {
    readonly gameTableService = inject(GameTableService);
    readonly pendingVisibilityToggles = signal(new Set<string>());
    private readonly adminService = inject(AdministrationService);
    private readonly gameService = inject(GameService);
    private readonly toastService = inject(ToastService);
    private readonly adminSocketService = inject(AdminSocketService);

    initializePageData(): void {
        this.gameTableService.tableData = [];
        this.fetchGames();
    }

    connectSocket(): void {
        this.adminSocketService.connect();
    }

    disconnectSocket(): void {
        this.adminSocketService.disconnect();
    }

    onGamesModified(): Observable<void> {
        return this.adminSocketService.onGamesModified();
    }

    fetchGames(): void {
        this.gameTableService.fetchGames(false);
    }

    changeGameVisibility(gameId: string, isVisible: boolean): Observable<unknown> {
        return this.adminService.changeGameVisibility(gameId, isVisible);
    }

    isVisibilityTogglePending(gameId: string): boolean {
        return this.pendingVisibilityToggles().has(gameId);
    }

    isVisibilityToggleLoading(game: IExistingGame, checkboxState: boolean): boolean {
        return this.isVisibilityTogglePending(game._id) || checkboxState !== this.gameIsViewable(game);
    }

    gameIsViewable(game: IExistingGame): boolean {
        return game.visibility === Visibility.Viewable;
    }

    toggleVisibility(input: HTMLInputElement, game: IExistingGame): void {
        if (this.isVisibilityTogglePending(game._id)) {
            return;
        }

        this.updateVisibilityTogglePending(game._id, true);
        this.changeGameVisibility(game._id, input.checked)
            .pipe(
                finalize(() => {
                    this.updateVisibilityTogglePending(game._id, false);
                }),
            )
            .subscribe({
                next: () => this.fetchGames(),
                error: (error: HttpErrorResponse) => {
                    input.checked = !input.checked;
                    this.showServerMessage(error, 'Il y a eu un problème lors du changement de visibilité.');
                },
            });
    }

    deleteGame(game: IExistingGame): Observable<unknown> {
        return this.gameService.deleteGame(game);
    }

    deleteGameAndHandleResult(game: IExistingGame): void {
        this.deleteGame(game).subscribe({
            next: () => {
                this.removeDeletedGameFromTable(game._id);
            },
            error: (error: HttpErrorResponse) => this.showServerMessage(error, 'Il y a eu un problème lors de la suppression.'),
        });
    }

    removeDeletedGameFromTable(gameId: string): void {
        this.gameTableService.tableData = this.gameTableService.tableData.filter((item) => item._id !== gameId);
    }

    showServerMessage(error: HttpErrorResponse, fallback: string): void {
        this.toastService.show(this.getServerMessage(error, fallback));
    }

    private getServerMessage(error: HttpErrorResponse, fallback: string): string {
        return mapErrorCodesToMessage(extractErrorCodes(error), fallback);
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
