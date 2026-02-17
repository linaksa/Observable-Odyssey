import { CommonModule } from '@angular/common';
import { Component, inject, Input } from '@angular/core';
import { EditionCellComponent } from '@app/components/edition/edition-cell/edition-cell.component';
import { ActiveGameService } from '@app/services/active-game.service';
import { BoardSharedService } from '@app/services/shared/boardShared.service';
import { CellType } from '@common/board';
import { IItem } from '@common/items';


@Component({
  selector: 'app-game',
    imports: [
        CommonModule,
        EditionCellComponent,
    ],
  styleUrl: '../../../styles/game-cell.scss',
  templateUrl: './game.component.html',
})
export class GameComponent {

    activeGameService: ActiveGameService = inject(ActiveGameService);
    boardSharedService: BoardSharedService = inject(BoardSharedService);


    @Input() cellType: CellType;
    @Input() rowIndex: number;
    @Input() colIndex: number;
    @Input() item: IItem | null;

}
