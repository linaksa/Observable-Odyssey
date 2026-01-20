import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { AppMaterialModule } from '@app/modules/material.module';
import { AdministrationService } from '@app/services/administrationService';
import { IGame, Visibility } from '@common/game';

@Component({
    selector: 'app-create-page',
    imports: [MatTableModule, MatTooltipModule, AppMaterialModule, RouterLink, DatePipe],
    templateUrl: './create-page.component.html',
    styleUrl: './create-page.component.scss',
})
export class CreatePageComponent implements OnInit {
    adminService: AdministrationService = inject(AdministrationService);
    displayedColumns: string[] = ['image', 'gameTitle', 'size', 'mode', 'lastEdited', 'actions'];
    dataSource = new MatTableDataSource<IGame>();

    ngOnInit(): void {
        this.adminService.getAllGames().subscribe((games) => {
            this.dataSource.data = games
                .filter((game) => game.visibility !== Visibility.Hidden)
                .map((game) => ({
                    gameTitle: game.gameTitle,
                    description: game.description,
                    gameMode: game.gameMode,
                    lastModifiedDate: new Date(game.lastModifiedDate),
                    dateCreated: new Date(game.dateCreated),
                    visibility: game.visibility,
                    preview: game.preview,
                    board: game.board,
                }));
        });
    }
}
