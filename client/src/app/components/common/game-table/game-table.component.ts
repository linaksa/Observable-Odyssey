import { DatePipe, NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoadingOverlayComponent } from '@app/components/common/loading-overlay/loading-overlay.component';
import { ToastComponent } from '@app/components/common/toast/toast.component';
import { AdminSocketService } from '@app/services/admin.socket.service';
import { AdministrationService } from '@app/services/administration.service';
import { GameTableService } from '@app/services/game-table.service';
import { GameService } from '@app/services/game.service';
import { ToastService } from '@app/services/toast.service';
import { IExistingGame, Visibility } from '@common/game';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-table',
    imports: [DatePipe, RouterLink, NgClass, LoadingOverlayComponent, ToastComponent],
    templateUrl: './game-table.component.html',
})
export class GameTableComponent implements OnInit, OnDestroy {
    private socketSubscription?: Subscription;

    adminService: AdministrationService = inject(AdministrationService);
    gameTableService: GameTableService = inject(GameTableService);
    gameService: GameService = inject(GameService);
    adminSocketService: AdminSocketService = inject(AdminSocketService);
    toastService = inject(ToastService);

    @Input() isAdmin = false;

    fetchCorrectGames(): void {
        if (this.isAdmin) {
            this.gameTableService.fetchGames();
        } else {
            this.gameTableService.fetchVisibleGames();
        }
    }

    ngOnInit(): void {
        this.gameTableService.tableData = [];
        this.fetchCorrectGames();

        this.adminSocketService.connect();
        this.socketSubscription = this.adminSocketService.onGamesModified().subscribe({
            next: () => {
                this.fetchCorrectGames();
            },
            error: (error: HttpErrorResponse) => {
                const serverMessage = error?.error?.error || "Il y a eu un problème lors de l'ajout des jeux.";
                this.toastService.show(serverMessage);
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
                this.toastService.show('Il y a eu un problème lors du changement de visibilité.');
            },
        });
    }

    deleteGame(element: IExistingGame): void {
        this.gameService.deleteGame(element).subscribe({
            next: () => {
                this.gameTableService.tableData = this.gameTableService.tableData.filter((item) => item._id !== element._id);
            },
            error: (error: HttpErrorResponse) => {
                const serverMessage = error?.error?.error || 'Il y a eu un problème lors de la suppression.';
                this.toastService.show(serverMessage);
            },
        });
    }

    ngOnDestroy(): void {
        if (this.socketSubscription) {
            this.socketSubscription.unsubscribe();
        }
        this.adminSocketService.disconnect();
        if (this.toastService.toastTimeoutId) {
            clearTimeout(this.toastService.toastTimeoutId);
        }
    }
}
