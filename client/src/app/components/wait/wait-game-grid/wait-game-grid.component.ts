import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { EditionCellComponent } from '@app/components/edition/edition-cell/edition-cell.component';
import { CELL_TYPE_PATHS, ITEM_TYPE_PATHS } from '@app/constants/backgrounds-mapping';
import { ActiveGameService } from '@app/services/active-game.service';
import { WaitGridService } from '@app/services/wait-grid.service';
import { CellType } from '@common/board';
import { IItem, ItemType } from '@common/items';

@Component({
    selector: 'app-wait-game-grid',
    imports: [CommonModule, EditionCellComponent],
    templateUrl: './wait-game-grid.component.html',
    styleUrl: '../../../styles/game-cell.scss',
})
export class WaitGameGridComponent {
    protected readonly waitGridService: WaitGridService = inject(WaitGridService);
    protected readonly activeGameService = inject(ActiveGameService);

    cellImagePath(cellType: CellType): string {
        return CELL_TYPE_PATHS[cellType];
    }

    objectImagePath(item: IItem | null): string {
        if (!item) return '';
        return ITEM_TYPE_PATHS[item.itemType];
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
