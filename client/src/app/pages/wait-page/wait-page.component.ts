import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, InputSignal, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ChatPanelComponent } from '@app/components/chat-pannel/chat-pannel.component';
import { LoadingOverlayComponent } from '@app/components/common/loading-overlay/loading-overlay.component';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { EditionCellComponent } from '@app/components/edition/edition-cell/edition-cell.component';
import { ActiveGameService } from '@app/services/active-game.service';
import { LocalPlayerService } from '@app/services/local-player.service';
import { BoardSharedService } from '@app/services/shared/boardShared.service';
import { WaitGridService } from '@app/services/wait-grid.service';
import { ICharacter } from '@common/character';
import { IExistingGame } from '@common/game';

@Component({
    selector: 'app-wait-page',
    imports: [
        NavButtonsComponent,
        PageTitleComponent,
        CommonModule,
        ReactiveFormsModule,
        EditionCellComponent,
        ChatPanelComponent,
        LoadingOverlayComponent,
    ],
    templateUrl: './wait-page.component.html',
    styleUrl: '../../styles/game-cell.scss',
})
export class WaitPageComponent implements OnInit {
    readonly gameToEdit: InputSignal<IExistingGame> = input.required<IExistingGame>();

    private readonly route: ActivatedRoute = inject(ActivatedRoute);
    private readonly localPlayerService: LocalPlayerService = inject(LocalPlayerService);
    readonly activeGameService = inject(ActiveGameService);

    readonly waitGridService: WaitGridService = inject(WaitGridService);
    readonly boardSharedService: BoardSharedService = inject(BoardSharedService);

    localPlayer?: ICharacter;
    otherPlayers: ICharacter[] = [];

    constructor() {
        effect(() => {
            if (!this.activeGameService.isLoading()) {
                this.initializeActiveGameData();
            }
        });
    }

    ngOnInit(): void {
        this.route.params.subscribe((params) => {
            this.activeGameService.setActiveGame(params.activeGameId);
        });
    }

    private initializeActiveGameData(): void {
        if (!this.activeGameService.activeGame || !this.activeGameService.activeGame.game) {
            return;
        }

        this.waitGridService.buildGrid(this.activeGameService.activeGame.game.board.cells.length);
        this.waitGridService.initFromExistingBoard(structuredClone(this.activeGameService.activeGame));

        this.localPlayer = this.localPlayerService.getLocalPlayer();
        if (this.localPlayer) {
            this.otherPlayers = this.activeGameService.activeGame.players.filter((p) => p.name !== this.localPlayer?.name);
        } else {
            this.otherPlayers = this.activeGameService.activeGame.players.slice();
        }
    }
}
