import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { AdministrationService } from '@app/services/admin/administration.service';
import { GameService } from '@app/services/admin/game.service';
import { AdminSocketService } from '@app/services/realtime/admin.socket.service';
import { GameTableService } from '@app/services/tables/game-table.service';
import { ToastService } from '@app/services/ui/toast.service';
import { extractErrorCodes, mapErrorCodesToMessage } from '@app/utils/error-codes';
import { IExistingGame } from '@common/game';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class AdministrationPageFacadeService {
    readonly gameTableService = inject(GameTableService);
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

    onGamesModified(): Observable<void> {
        return this.adminSocketService.onGamesModified();
    }

    fetchGames(): void {
        this.gameTableService.fetchGames(false);
    }

    changeGameVisibility(gameId: string, isVisible: boolean): Observable<unknown> {
        return this.adminService.changeGameVisibility(gameId, isVisible);
    }

    deleteGame(game: IExistingGame): Observable<unknown> {
        return this.gameService.deleteGame(game);
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
}
