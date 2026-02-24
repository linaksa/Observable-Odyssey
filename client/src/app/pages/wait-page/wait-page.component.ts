import { CommonModule } from '@angular/common';
import { Component, inject, input, InputSignal, OnInit } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NavButtonsComponent } from '@app/components/common/nav-buttons/nav-buttons.component';
import { PageTitleComponent } from '@app/components/common/page-title/page-title.component';
import { EditionCellComponent } from '@app/components/edition/edition-cell/edition-cell.component';
import { GameService } from '@app/services/game.service';
import { LocalPlayerService } from '@app/services/local-player.service';
import { BoardSharedService } from '@app/services/shared/boardShared.service';
import { WaitGridService } from '@app/services/wait-grid.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType, GameSize } from '@common/constants';
import { GameType, IExistingGame, Visibility } from '@common/game';

@Component({
    selector: 'app-wait-page',
    imports: [NavButtonsComponent, PageTitleComponent, CommonModule, ReactiveFormsModule, EditionCellComponent],
    templateUrl: './wait-page.component.html',
    styleUrl: '../../styles/game-cell.scss',
})
export class WaitPageComponent implements OnInit {
    readonly gameToEdit: InputSignal<IExistingGame> = input.required<IExistingGame>();

    private readonly route: ActivatedRoute = inject(ActivatedRoute);
    private readonly gameService: GameService = inject(GameService);
    private readonly localPlayerService: LocalPlayerService = inject(LocalPlayerService);

    readonly waitGridService: WaitGridService = inject(WaitGridService);
    readonly boardSharedService: BoardSharedService = inject(BoardSharedService);

    activeGame: IActiveGame;
    localPlayer?: ICharacter;
    otherPlayers: ICharacter[] = [];

    ngOnInit(): void {
        this.route.params.subscribe((params) => {
            if (params.activeGameId === 'admin') {
                const size = Math.sqrt(GameSize.Small);
                this.activeGame = {
                    _id: '',
                    game: {
                        gameTitle: '',
                        gameMode: GameType.Classic,
                        description: '',
                        lastModifiedDate: new Date(),
                        dateCreated: new Date(),
                        visibility: Visibility.Hidden,
                        preview: '',
                        board: {
                            items: [],
                            cells: Array.from({ length: size }, () => Array(size).fill(CellType.Empty)),
                        },
                    },
                    players: [
                        {
                            name: 'Player 1',
                            avatar: Avatar.Avatar2,
                            initialHealth: 10,
                            currentHealth: 10,
                            attackBonusDiceType: DiceType.FourSided,
                            defenseBonusDiceType: DiceType.FourSided,
                            rapidityPoints: 5,
                            attackPoints: 3,
                            defensePoints: 2,
                            actionsLeft: 2,
                            movementLeft: 3,
                            wonCombatCount: 0,
                            hasAbandoned: false,
                            x: 0,
                            y: 0,
                        },
                        {
                            name: 'Player 2',
                            avatar: Avatar.Avatar8,
                            initialHealth: 10,
                            currentHealth: 10,
                            attackBonusDiceType: DiceType.FourSided,
                            defenseBonusDiceType: DiceType.FourSided,
                            rapidityPoints: 5,
                            attackPoints: 3,
                            defensePoints: 2,
                            actionsLeft: 2,
                            movementLeft: 3,
                            wonCombatCount: 0,
                            hasAbandoned: false,
                            x: 0,
                            y: 0,
                        },
                        {
                            name: 'Player 3',
                            avatar: Avatar.Avatar6,
                            initialHealth: 10,
                            currentHealth: 10,
                            attackBonusDiceType: DiceType.FourSided,
                            defenseBonusDiceType: DiceType.FourSided,
                            rapidityPoints: 5,
                            attackPoints: 3,
                            defensePoints: 2,
                            actionsLeft: 2,
                            movementLeft: 3,
                            wonCombatCount: 0,
                            hasAbandoned: true,
                            x: 0,
                            y: 0,
                        },
                    ],
                    itemsState: [],
                    currentPlayerIndex: 0,
                    messages: [],
                };
                this.initializeActiveGameData();
            } else {
                this.gameService.getActiveGameById(params.activeGameId).subscribe((game) => {
                    this.activeGame = game;
                    this.initializeActiveGameData();
                });
            }
        });
    }

    private initializeActiveGameData(): void {
        this.waitGridService.buildGrid(this.activeGame.game.board.cells.length);
        this.waitGridService.initFromExistingBoard(structuredClone(this.activeGame));

        this.localPlayer = this.localPlayerService.getLocalPlayer();
        if (this.localPlayer) {
            this.otherPlayers = this.activeGame.players.filter((p) => p.name !== this.localPlayer?.name);
        } else {
            this.otherPlayers = this.activeGame.players.slice();
        }
    }
}
