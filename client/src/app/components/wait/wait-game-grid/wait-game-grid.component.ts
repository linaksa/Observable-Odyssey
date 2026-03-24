import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { GameGridComponent } from '@app/components/common/game-grid/game-grid.component';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { CellType } from '@common/board';
import { IItem } from '@common/items';

@Component({
    selector: 'app-wait-game-grid',
    imports: [CommonModule, GameGridComponent],
    templateUrl: './wait-game-grid.component.html',
})
export class WaitGameGridComponent {
    private readonly boardSharedService: BoardSharedService = inject(BoardSharedService);

    protected readonly activeGameService = inject(ActiveGameService);

    protected get table(): CellType[][] {
        return this.activeGameService.activeGame.game.board.cells;
    }

    protected get tableSize(): number {
        return this.table.length;
    }

    protected get items(): IItem[] {
        return this.activeGameService.activeGame.game.board.items;
    }

    readonly getObjectAt = (row: number, col: number): IItem | null => {
        return this.boardSharedService.getObjectAt(row, col, this.items);
    };

    protected get gameTitle(): string {
        return this.activeGameService.activeGame.game.gameTitle;
    }

    protected get gameDescription(): string {
        return this.activeGameService.activeGame.game.description;
    }

    protected get gameMode(): string {
        return this.activeGameService.activeGame.game.gameMode === 'classic' ? 'Normal' : 'CTF';
    }

    protected get lockIcon(): string {
        const full = this.activeGameService.activeGame.players.length >= this.activeGameService.activeGame.maxPlayerCount;
        return full ? 'assets/wait-page/lock.svg' : 'assets/wait-page/unlock.svg';
    }
}
