import { Injectable } from '@angular/core';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { IItem } from '@common/items';

@Injectable({
    providedIn: 'root',
})
export class WaitGridService {
    gameCells: CellType[][] = [];
    objects: IItem[] = [];

    initFromExistingBoard(game: IActiveGame): void {
        if (!game) return;

        if (game.game.board) {
            this.gameCells = structuredClone(game.game.board.cells ?? []);
            this.objects = structuredClone(game.game.board.items ?? []);
            return;
        }
    }

    buildGrid(size: number): void {
        if (!size || size <= 0) {
            this.gameCells = [];
            this.objects = [];
            return;
        }

        this.gameCells = Array.from({ length: size }, () => Array.from({ length: size }, () => CellType.Empty));
        this.objects = [];
    }
}
