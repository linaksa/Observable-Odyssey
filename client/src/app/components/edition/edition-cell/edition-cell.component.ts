import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { BoardEditorService } from '@app/services/edition.service';
import { CellType } from '@common/board';
import { ItemType } from '@common/items';

const CELL_TYPE_BACKGROUDS: { [key in CellType]: string } = {
    [CellType.Empty]: 'bg-[url("/assets/edit-page/sprites/grass.png")]',
    [CellType.Ice]: 'bg-[url("/assets/edit-page/sprites/ice.png")]',
    [CellType.Water]: 'bg-[url(/assets/edit-page/sprites/water.png)]',
    [CellType.Wall]: 'bg-[url(/assets/edit-page/sprites/wall.png)]',
    [CellType.OpenDoor]: 'bg-[url(/assets/edit-page/sprites/openedDoor.png)]',
    [CellType.ClosedDoor]: 'bg-[url(/assets/edit-page/sprites/closedDoor.png)]',
};

@Component({
    selector: 'app-edition-cell',
    imports: [CommonModule],
    templateUrl: './edition-cell.component.html',
    styleUrl: './edition-cell.component.scss',
})
export class EditionCellComponent {
    board = inject(BoardEditorService);

    @Output() mousedDownCell = new EventEmitter<MouseEvent>();
    @Output() mouseMoveCell = new EventEmitter<MouseEvent>();
    @Input() cellType: CellType;
    @Input() i!: number;
    @Input() j!: number;

    get backgroundImage(): string {
        return `${CELL_TYPE_BACKGROUDS[this.cellType]}`;
    }

    protected readonly itemType = ItemType;
}
