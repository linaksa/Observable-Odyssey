import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatPanelComponent } from '@app/components/chat/chat-pannel/chat-pannel.component';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { FinalPlayerListComponent } from '@app/components/end-game/final-player-list/final-player-list.component';
import { GameService } from '@app/services/admin/game.service';
import { IActiveGame } from '@common/activeGame';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-game-end',
    imports: [NavButtonsComponent, PageTitleComponent, ChatPanelComponent, FinalPlayerListComponent],
    templateUrl: './game-end.component.html',
})
export class GameEndComponent {
    private readonly router = inject(ActivatedRoute);
    private gameService = inject(GameService);
    private routeSubscription?: Subscription;

    activeGame: IActiveGame | null = null;

    ngOnInit(): void {
        this.routeSubscription = this.router.params.subscribe((params) => {
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
