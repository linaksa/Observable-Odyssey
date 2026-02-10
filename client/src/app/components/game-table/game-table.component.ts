import { DatePipe, NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { AdminSocketService } from '@app/services/admin.socket.service';
import { AdministrationService } from '@app/services/administrationService';
import { GameTableService } from '@app/services/game-table.service';
import { GameService } from '@app/services/game.service';
import { IExistingGame, Visibility } from '@common/game';

@Component({
    selector: 'app-game-table',
    imports: [DatePipe, RouterLink, NgClass],
    templateUrl: './game-table.component.html',
})
export class GameTableComponent implements OnInit, OnDestroy {
    private _snackBar = inject(MatSnackBar);
    private _closeString = 'Fermer';

    adminService: AdministrationService = inject(AdministrationService);
    gameTableService: GameTableService = inject(GameTableService);
    gameService: GameService = inject(GameService);
    adminSocketService: AdminSocketService = inject(AdminSocketService);

    @Input() isAdmin = false;

    fetchCorrectGames(): void {
        if (this.isAdmin) {
            this.gameTableService.fetchGames();
        } else {
            this.gameTableService.fetchVisibleGames();
        }
    }

    ngOnInit(): void {
        this.gameTableService.tableData.data = [];

        this.fetchCorrectGames();

        this.adminSocketService.fetchGamesOnSignal().subscribe({
            next: () => {
                this.fetchCorrectGames();
            },
            error: (error: HttpErrorResponse) => {
                const serverMessage = error?.error?.error || "Il y a eu un problème lors de l'ajout des jeux.";
                this._snackBar.open(serverMessage, this._closeString);
            },
        });
    }

    gameIsViewable(element: IExistingGame): boolean {
        return element.visibility === Visibility.Viewable;
    }

    toggleVisibility(event: Event, element: IExistingGame): void {
        const input = event.target as HTMLInputElement;
        input.disabled = true;

        this.adminService.changeGameVisibility(element._id, input.checked).subscribe({
            next: () => {
                this.gameTableService.fetchGames();
                input.disabled = false;
            },
            error: () => {
                input.disabled = false;
                input.checked = !input.checked;
            },
        });
    }

    deleteGame(element: IExistingGame): void {
        this.gameService.deleteGame(element).subscribe({
            next: () => {
                this.gameTableService.tableData.data = this.gameTableService.tableData.data.filter((item) => item._id !== element._id);
            },
            error: (error: HttpErrorResponse) => {
                const serverMessage = error?.error?.error || 'Il y a eu un problème lors de la suppression.';
                this._snackBar.open(serverMessage, this._closeString);
            },
        });
    }

    ngOnDestroy(): void {
        this.adminSocketService.disconnect();
    }
}
