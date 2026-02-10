import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CELL_TYPE_BACKGROUNDS, OBJECT_IMAGES } from '@app/constants/backgrounds-mapping';
import { CellType } from '@common/board';
import { IItem, ItemType } from '@common/items';

@Component({
    selector: 'app-edition-cell',
    imports: [CommonModule],
    templateUrl: './edition-cell.component.html',
})
export class EditionCellComponent {
    @Output() mousedDownCell = new EventEmitter<MouseEvent>();
    @Output() mouseEnterCell = new EventEmitter<MouseEvent>();
    @Input() cellType: CellType;
    @Input() rowIndex: number;
    @Input() colIndex: number;
    @Input() item: IItem | null;

    get backgroundImage(): string {
        return `${CELL_TYPE_BACKGROUNDS[this.cellType]}`;
    }

    get backgroundImageForObject(): string {
        if (!this.item) return '';
        return `${OBJECT_IMAGES[this.item.itemType as ItemType]}`;
    }

    get objectExtraStyles(): { [key: string]: string } {
        if (!this.item) return {};

        if (this.item.itemType === ItemType.LifeSanctuary || this.item.itemType === ItemType.FightSanctuary) {
            // key cannot be camel case because it is a css rule;
            // eslint-disable-next-line @typescript-eslint/naming-convention
            return { 'background-position': this.getSanctuaryBgPosition(this.rowIndex, this.colIndex, this.item) };
        }

        return {};
    }

    getSanctuaryBgPosition(row: number, col: number, item: IItem): string {
        if (row === item.x && col === item.y) {
            return '0% 0%';
        } else if (row === item.x && col === item.y + 1) {
            return '100% 0%';
        } else if (row === item.x + 1 && col === item.y) {
            return '0% 100%';
        } else if (row === item.x + 1 && col === item.y + 1) {
            return '100% 100%';
        }
        return '';
    }

    protected readonly itemType = ItemType;
}
