import { Component, DestroyRef, inject, OnDestroy, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { GameTableComponent } from '@app/components/common/game-table/game-table.component';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { ToastComponent } from '@app/components/common/toast/toast.component';
import { ActiveGameTableService } from '@app/services/tables/active-game-table.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';

@Component({
    selector: 'app-join-page',
    imports: [GameTableComponent, RouterLink, NavButtonsComponent, PageTitleComponent, ToastComponent],
    templateUrl: './join-page.component.html',
})
export class JoinPageComponent implements OnInit, OnDestroy {
    private readonly destroyRef = inject(DestroyRef);
    private readonly socketService = inject(SocketService);
    private readonly socketNamespace = Namespaces.ActiveGameAdmin;
    protected readonly activeGameTableService = inject(ActiveGameTableService);

    ngOnInit(): void {
        this.activeGameTableService.tableData = [];
        this.fetchJoinableGames();

        this.socketService.connect(this.socketNamespace);
        this.socketService
            .on<void>(this.socketNamespace, SocketEvent.JoinableGamesUpdated)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => this.fetchJoinableGames(),
            });
    }

    ngOnDestroy(): void {
        this.socketService.disconnect(this.socketNamespace);
    }

    private fetchJoinableGames(): void {
        this.activeGameTableService.fetchJoinableActiveGames();
    }
}
