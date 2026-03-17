import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CELL_TYPE_PATHS, ITEM_TYPE_PATHS } from '@app/constants/backgrounds-mapping';
import { ActiveGameService } from '@app/services/active-game.service';
import { BoardSharedService } from '@app/services/shared/boardShared.service';
import { CellType } from '@common/board';
import { IItem, ItemType } from '@common/items';

@Component({
    selector: 'app-wait-game-grid',
    imports: [CommonModule],
    templateUrl: './wait-game-grid.component.html',
})
export class WaitGameGridComponent {
    private readonly boardSharedService: BoardSharedService = inject(BoardSharedService);

    protected readonly activeGameService = inject(ActiveGameService);

    protected get table(): CellType[][] {
        return this.activeGameService.activeGame.game.board.cells;
    }

    protected get items(): IItem[] {
        return this.activeGameService.activeGame.game.board.items;
    }

    protected get gameTitle(): string {
        return this.activeGameService.activeGame.game.gameTitle;
    }

    protected get gameDescription(): string {
        return this.activeGameService.activeGame.game.description;
    }

    protected get tableSize(): number {
        return this.activeGameService.activeGame.game.board.cells.length;
    }

    protected get gameMode(): string {
        return this.activeGameService.activeGame.game.gameMode === 'classic' ? 'Normal' : 'CTF';
    }

    cellImagePath(cellType: CellType): string {
        return CELL_TYPE_PATHS[cellType];
    }

    objectImagePath(item: IItem | null): string {
        if (!item) return '';
        return ITEM_TYPE_PATHS[item.itemType];
    }

    getObjectAt(row: number, col: number): IItem | null {
        return this.boardSharedService.getObjectAt(row, col, this.items);
    }

    objectExtraStyles(item: IItem, row: number, col: number): Record<string, string> {
        if (!item) return {};

        if (item.itemType === ItemType.LifeSanctuary || item.itemType === ItemType.FightSanctuary) {
            const relativeRow = row - item.x;
            const relativeCol = col - item.y;
            const left = relativeCol === 0 ? '0' : '-100%';
            const top = relativeRow === 0 ? '0' : '-100%';

            return {
                top,
                left,
                width: '200%',
                height: '200%',
            };
        }

        return {
            inset: '0',
            width: '100%',
            height: '100%',
        };
    }
}
