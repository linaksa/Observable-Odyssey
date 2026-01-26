import { DatePipe, NgClass } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdministrationService } from '@app/services/administrationService';
import { GameTableServiceService } from '@app/services/game-table.service';
import { GameService } from '@app/services/game.service';
import { IExistingGame, Visibility } from '@common/game';

@Component({
    selector: 'app-game-table',
    imports: [DatePipe, RouterLink, NgClass],
    templateUrl: './game-table.component.html',
    styleUrl: './game-table.component.scss',
})
export class GameTableComponent implements OnInit {
    adminService: AdministrationService = inject(AdministrationService);
    gameTableService: GameTableServiceService = inject(GameTableServiceService);
    gameService: GameService = inject(GameService);

    @Input() isAdmin = false;

    ngOnInit(): void {
        this.gameTableService.tableData.data = [];

        if (this.isAdmin) {
            this.gameTableService.fetchGames();
        } else {
            this.gameTableService.fetchVisibleGames();
        }
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
        });
    }
}
