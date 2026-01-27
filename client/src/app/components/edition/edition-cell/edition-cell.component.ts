import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { CellType } from '@common/board';
import { BoardEditorService } from '@app/services/edition.service';
import { ItemType } from '@common/items';

const CELL_TYPE_BACKGROUDS: { [key in CellType]: string } = {
    [CellType.Empty]: 'bg-[url("/assets/grass-img.png")]',
    [CellType.Ice]: 'bg-[url("/assets/ice.png")]',
    [CellType.Water]: 'bg-[url(/assets/water.png)]',
    [CellType.Wall]: 'bg-[url(/assets/wallTest.png)]',
    [CellType.OpenDoor]: 'bg-[url(/assets/openDoor.png)]',
    [CellType.ClosedDoor]: 'bg-[url(/assets/doorClosed.png)]',
};

@Component({
  selector: 'app-edition-cell',
  imports: [CommonModule],
  templateUrl: './edition-cell.component.html',
  styleUrl: './edition-cell.component.scss',
})
export class EditionCellComponent {

    board = inject(BoardEditorService);

    @Output() mousedDownCell = new EventEmitter<void>();
    @Output() mouseMoveCell = new EventEmitter<void>();

    @Input() cellType: CellType;
    @Input() i!: number;
    @Input() j!: number;

    get backgroundImage(): string {
        return `${CELL_TYPE_BACKGROUDS[this.cellType]}`;
    }

    protected readonly itemType = ItemType;
}
