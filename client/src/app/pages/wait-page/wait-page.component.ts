import { Component, effect, inject, input, InputSignal, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LoadingOverlayComponent } from '@app/components/common/loading-overlay/loading-overlay.component';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { WaitChatSidebarComponent } from '@app/components/wait/wait-chat-sidebar/wait-chat-sidebar.component';
import { WaitGameGridComponent } from '@app/components/wait/wait-game-grid/wait-game-grid.component';
import { WaitPlayerListComponent } from '@app/components/wait/wait-player-list/wait-player-list.component';
import { ActiveGameService } from '@app/services/active-game.service';
import { LocalPlayerService } from '@app/services/local-player.service';
import { WaitGridService } from '@app/services/wait-grid.service';
import { ICharacter } from '@common/character';
import { IExistingGame } from '@common/game';

@Component({
    selector: 'app-wait-page',
    imports: [
        NavButtonsComponent,
        PageTitleComponent,
        LoadingOverlayComponent,
        WaitPlayerListComponent,
        WaitGameGridComponent,
        WaitChatSidebarComponent,
        RouterLink,
    ],
    templateUrl: './wait-page.component.html',
})
export class WaitPageComponent implements OnInit, OnDestroy {
    readonly gameToEdit: InputSignal<IExistingGame> = input.required<IExistingGame>();

    private readonly route: ActivatedRoute = inject(ActivatedRoute);
    private readonly router: Router = inject(Router);
    private readonly localPlayerService: LocalPlayerService = inject(LocalPlayerService);
    private readonly timeout: number = 3000;

    readonly activeGameService: ActiveGameService = inject(ActiveGameService);
    readonly waitGridService: WaitGridService = inject(WaitGridService);

    localPlayer?: ICharacter;
    showButton: boolean = false;

    constructor() {
        effect(() => {
            if (!this.activeGameService.isLoading()) {
                this.initializeActiveGameData();
            }
        });
    }

    ngOnInit(): void {
        this.initializeButtonTimeout();

        this.route.params.subscribe((params) => {
            this.activeGameService.setActiveGame(params.activeGameId);
        });
    }

    ngOnDestroy(): void {
        const localPlayerName = this.localPlayer?.name;
        const activeGameId = this.activeGameService.activeGame?._id;

        if (!localPlayerName || !activeGameId) {
            return;
        }

        this.activeGameService.leaveActiveGame(localPlayerName).subscribe({
            complete: () => this.localPlayerService.clear(),
        });
    }

    private initializeActiveGameData(): void {
        if (!this.activeGameService.activeGame || !this.activeGameService.activeGame.game) {
            return;
        }

        this.waitGridService.buildGrid(this.activeGameService.activeGame.game.board.cells.length);
        this.waitGridService.initFromExistingBoard(structuredClone(this.activeGameService.activeGame));

        this.localPlayerService.restoreFromActiveGame(this.activeGameService.activeGame);
        this.localPlayer = this.localPlayerService.getLocalPlayer();
    }

    private initializeButtonTimeout(): void {
        setTimeout(() => {
            this.showButton = true;
        }, this.timeout);
    }
}
