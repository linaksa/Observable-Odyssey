import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LoadingOverlayComponent } from '@app/components/common/loading-overlay/loading-overlay.component';
import { ActiveGameTableService } from '@app/services/active-game-table.service';
import { SocketService } from '@app/services/socket.service';
import { IActiveGame } from '@common/activeGame';
import { BOARD_SIZE_TO_PLAYER_COUNT } from '@common/board';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Subscription } from 'rxjs/internal/Subscription';

@Component({
    selector: 'app-active-game-table',
    imports: [LoadingOverlayComponent, RouterLink],
    templateUrl: './active-game-table.component.html',
})
export class ActiveGameTableComponent implements OnInit, OnDestroy {
    private readonly socketService = inject(SocketService);
    activeGameTableService = inject(ActiveGameTableService);
    private socketNamespace = Namespaces.ActiveGameAdmin;

    private socketSubscription: Subscription;

    ngOnInit(): void {
        this.activeGameTableService.fetchJoinableActiveGames();

        this.socketSubscription?.unsubscribe();
        this.socketService.connect(this.socketNamespace);

        this.socketSubscription = this.socketService.on<void>(this.socketNamespace, SocketEvent.JoinableGamesUpdated).subscribe({
            next: () => {
                this.activeGameTableService.fetchJoinableActiveGames();
            },
        });
    }

    ngOnDestroy(): void {
        this.socketSubscription?.unsubscribe();
    }

    getMaxPlayerCountForGame(activeGame: IActiveGame): number {
        return BOARD_SIZE_TO_PLAYER_COUNT[activeGame.game.board.cells.length] || 0;
    }
}
