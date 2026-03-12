import { CommonModule } from '@angular/common';
import { Component, effect, HostListener, inject, Input, OnInit } from '@angular/core';
import { EditionCellComponent } from '@app/components/edition/edition-cell/edition-cell.component';
import { ActiveGameService } from '@app/services/active-game.service';
import { LocalPlayerService } from '@app/services/local-player.service';
import { BoardSharedService } from '@app/services/shared/boardShared.service';
import { buildGraph } from '@app/utils/pathfinding';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { IItem } from '@common/items';

@Component({
    selector: 'app-game',
    imports: [CommonModule, EditionCellComponent],
    styleUrl: '../../../styles/game-cell.scss',
    templateUrl: './game.component.html',
})
export class GameComponent implements OnInit {

    protected readonly activeGameService: ActiveGameService = inject(ActiveGameService);
    protected readonly boardSharedService: BoardSharedService = inject(BoardSharedService);
    private readonly localPlayerService: LocalPlayerService = inject(LocalPlayerService);

    private get isLocalPlayerTurn(): boolean {
        const localPlayer = this.localPlayerService.getLocalPlayer();
        if (!localPlayer) return false;
        const currentPlayer = this.activeGameService.getCurrentPlayer();
        return currentPlayer?.name === localPlayer.name;
    }

    graph: [number, number][][] = [];

    totalRows = 0;
    totalColumns = 0;

    @Input() cellType: CellType;
    @Input() rowIndex: number;
    @Input() colIndex: number;
    @Input() item: IItem | null;
    @Input() players: ICharacter[] = [];

    constructor() {

        effect(() => {
            this.activeGameService.currentPlayer();
            this.activeGameService.hasChangedLocation();
            this.activeGameService.updateMovementRange(this.totalColumns, this.graph);
        });

    }

    ngOnInit() {

        const board = this.activeGameService.activeGame.game.board.cells;
        this.totalRows = board.length;
        this.totalColumns = board[0].length;
        this.graph = buildGraph(board);

        this.activeGameService.updateMovementRange(this.totalColumns, this.graph);
    }

    @HostListener('window:keydown', ['$event'])
    handleKeyboard(event: KeyboardEvent) {
        if (!this.isLocalPlayerTurn) return;

        switch (event.key.toLowerCase()) {
            case 'w':
                this.activeGameService.tryMove(-1, 0, this.totalColumns);
                break;

            case 's':
                this.activeGameService.tryMove(1, 0, this.totalColumns);
                break;

            case 'a':
                this.activeGameService.tryMove(0, -1, this.totalColumns);
                break;

            case 'd':
                this.activeGameService.tryMove(0, 1, this.totalColumns);
                break;
        }
    }
    onPlayerClicked(playerName: string) {
        if (!this.activeGameService.attackMode() || !this.isLocalPlayerTurn) {
            return;
        }
        this.activeGameService.attackPlayer(playerName);

        this.activeGameService.attackMode.set(false);
    }


}
