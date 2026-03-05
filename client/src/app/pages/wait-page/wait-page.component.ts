import { CommonModule } from '@angular/common';
import { Component, effect, inject, input, InputSignal, OnDestroy, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ChatPanelComponent } from '@app/components/chat-pannel/chat-pannel.component';
import { LoadingOverlayComponent } from '@app/components/common/loading-overlay/loading-overlay.component';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { EditionCellComponent } from '@app/components/edition/edition-cell/edition-cell.component';
import { ActiveGameService } from '@app/services/active-game.service';
import { LocalPlayerService } from '@app/services/local-player.service';
import { BoardSharedService } from '@app/services/shared/boardShared.service';
import { SocketService } from '@app/services/socket.service';
import { WaitGridService } from '@app/services/wait-grid.service';
import { ICharacter } from '@common/character';
import { IExistingGame } from '@common/game';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Subscription } from 'rxjs';

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
export class WaitPageComponent implements OnInit, OnDestroy {
    readonly gameToEdit: InputSignal<IExistingGame> = input.required<IExistingGame>();

    private readonly route: ActivatedRoute = inject(ActivatedRoute);
    private readonly router: Router = inject(Router);
    private readonly localPlayerService: LocalPlayerService = inject(LocalPlayerService);
    private readonly socketService: SocketService = inject(SocketService);
    readonly activeGameService = inject(ActiveGameService);

    readonly waitGridService: WaitGridService = inject(WaitGridService);
    readonly boardSharedService: BoardSharedService = inject(BoardSharedService);

    localPlayer?: ICharacter;
    otherPlayers: ICharacter[] = [];
    activeGameId?: string;
    private routeSubscription?: Subscription;
    private startGameSubscription?: Subscription;
    private playersUpdatedSubscription?: Subscription;

    constructor() {
        effect(() => {
            if (!this.activeGameService.isLoading()) {
                this.initializeActiveGameData();
            }
        });
    }

    ngOnInit(): void {
        this.routeSubscription = this.route.params.subscribe((params) => {
            this.activeGameId = params.activeGameId;
            if (!this.activeGameId) {
                return;
            }
            this.activeGameService.setActiveGame(this.activeGameId);
            this.socketService.connect(Namespaces.Game);
            this.socketService.emit<string, void>(Namespaces.Game, SocketEvent.JoinGame, this.activeGameId);

            this.startGameSubscription?.unsubscribe();
            this.startGameSubscription = this.socketService.on<string>(Namespaces.Game, SocketEvent.StartGame).subscribe({
                next: (startedGameId) => {
                    if (!startedGameId || startedGameId !== this.activeGameId) {
                        return;
                    }
                    this.router.navigate(['/play', startedGameId]);
                },
            });

            this.playersUpdatedSubscription?.unsubscribe();
            this.playersUpdatedSubscription = this.socketService.on<ICharacter[]>(Namespaces.Game, SocketEvent.PlayersUpdated).subscribe({
                next: (players) => {
                    this.activeGameService.updatePlayers(players);
                    this.initializeActiveGameData();
                },
            });
        });
    }

    startGame(): void {
        if (!this.activeGameId) {
            return;
        }
        this.socketService.emit<string, void>(Namespaces.Game, SocketEvent.StartGame, this.activeGameId);
    }

    ngOnDestroy(): void {
        this.routeSubscription?.unsubscribe();
        this.startGameSubscription?.unsubscribe();
        this.playersUpdatedSubscription?.unsubscribe();
        this.socketService.disconnect(Namespaces.Game);
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
