import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { Position } from '@common/character';
import { Service } from 'typedi';
import { sanctuaryCoversCell } from '@app/services/gameplay/sanctuary-helpers';

@Service()
export class PositionValidatorService {
    isAdjacent(pos1: Position, pos2: Position): boolean {
        const dx = Math.abs(pos1.x - pos2.x);
        const dy = Math.abs(pos1.y - pos2.y);
        return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
    }

    isWalkable(position: Position, currentActiveGame: IActiveGame): boolean {
        if (
            position.y < 0 ||
            position.y >= currentActiveGame.game.board.cells.length ||
            position.x < 0 ||
            position.x >= currentActiveGame.game.board.cells[0].length
        ) {
            return false;
        }
        const tile = currentActiveGame.game.board.cells[position.y][position.x];
        if (!tile) return false;
        const items = currentActiveGame.game.board.items ?? [];
        if (items.some((item) => sanctuaryCoversCell(item, position.y, position.x))) return false;
        return this.isWalkableCell(tile);
    }

    isWalkableCell(cellType: CellType): boolean {
        return cellType !== CellType.Wall && cellType !== CellType.ClosedDoor && cellType !== undefined;
    }

    isOccupiedByPlayer(position: Position, currentActiveGame: IActiveGame): boolean {
        return currentActiveGame.players.some((p) => p.positionGrille.x === position.x && p.positionGrille.y === position.y);
    }

    isValidRespawnTile(position: Position, currentActiveGame: IActiveGame): boolean {
        return !this.isOccupiedByPlayer(position, currentActiveGame) && this.isWalkable(position, currentActiveGame);
    }
}
