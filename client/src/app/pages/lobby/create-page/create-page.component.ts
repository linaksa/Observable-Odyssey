import { Component, DestroyRef, inject, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { GameTableComponent } from '@app/components/common/game-table/game-table.component';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { AdminSocketService } from '@app/services/realtime/admin.socket.service';
import { GameTableService } from '@app/services/tables/game-table.service';

@Component({
    selector: 'app-create-page',
    imports: [GameTableComponent, RouterLink, NavButtonsComponent, PageTitleComponent],
    templateUrl: './create-page.component.html',
})
export class CreatePageComponent implements OnInit, OnDestroy {
    private readonly destroyRef = inject(DestroyRef);
    private readonly adminSocketService = inject(AdminSocketService);
    protected readonly gameTableService: GameTableService = inject(GameTableService);

    ngOnInit(): void {
        this.gameTableService.tableData = [];
        this.fetchVisibleGames();

        this.adminSocketService.connect();
        this.adminSocketService
            .onGamesModified()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.fetchVisibleGames(),
            });
    }

    ngOnDestroy(): void {
        this.adminSocketService.disconnect();
    }

    private fetchVisibleGames(): void {
        this.gameTableService.fetchGames(true);
    }
}
