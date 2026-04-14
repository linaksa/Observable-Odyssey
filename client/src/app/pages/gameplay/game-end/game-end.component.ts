import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MessageZoneComponent } from '@app/components/common/message-zone/message-zone.component';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { FinalPlayerListComponent } from '@app/components/end-game/final-player-list/final-player-list.component';
import { GlobalStatsComponent } from '@app/components/end-game/global-stats/global-stats.component';
import { GameService } from '@app/services/admin/game.service';
import { IActiveGame } from '@common/active-game';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-end',
    imports: [NavButtonsComponent, PageTitleComponent, MessageZoneComponent, FinalPlayerListComponent, GlobalStatsComponent],
    templateUrl: './game-end.component.html',
})
export class GameEndComponent implements OnInit, OnDestroy {
    private readonly route = inject(ActivatedRoute);
    private readonly gameService = inject(GameService);
    private routeSubscription?: Subscription;

    activeGame: IActiveGame | null = null;

    ngOnInit(): void {
        this.routeSubscription = this.route.params.subscribe((params) => {
            if (params.activeGameId) {
                this.gameService.getActiveGameById(params.activeGameId).subscribe((game) => {
                    this.activeGame = game;
                });
            }
        });
    }

    ngOnDestroy(): void {
        this.routeSubscription?.unsubscribe();
    }
}
