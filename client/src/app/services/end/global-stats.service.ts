import { Injectable } from '@angular/core';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ItemType } from '@common/items';

@Injectable({
    providedIn: 'root',
})
export class GlobalStatsService {
    getTotalSanctuaryCount(activeGame: IActiveGame): number {
        return activeGame.game.board.items.filter((item) => item.itemType === ItemType.LifeSanctuary || item.itemType === ItemType.FightSanctuary)
            .length;
    }

    getTotalDoorCount(activeGame: IActiveGame): number {
        return activeGame.game.board.cells.flat().filter((cell) => cell === CellType.OpenDoor || cell === CellType.ClosedDoor).length;
    }

    getTotalTerrainTileCount(activeGame: IActiveGame): number {
        return activeGame.game.board.cells.flat().filter((cell) => this.isTerrainCell(cell)).length;
    }

    getVisitedTerrainTileCount(activeGame: IActiveGame): number {
        const visitedCells = new Set<string>();

        for (const player of activeGame.players) {
            for (const visitedCell of player.visitedCells ?? []) {
                if (!visitedCell || visitedCells.has(visitedCell)) {
                    continue;
                }

                const [xString, yString] = visitedCell.split(',');
                const x = Number.parseInt(xString, 10);
                const y = Number.parseInt(yString, 10);
                if (!Number.isFinite(x) || !Number.isFinite(y)) {
                    continue;
                }

                const row = activeGame.game.board.cells[y];
                const cell = row?.[x];
                if (this.isTerrainCell(cell)) {
                    visitedCells.add(visitedCell);
                }
            }
        }

        return visitedCells.size;
    }

    private isTerrainCell(cell: CellType | undefined): boolean {
        return cell === CellType.Empty || cell === CellType.Ice || cell === CellType.Water;
    }
}
