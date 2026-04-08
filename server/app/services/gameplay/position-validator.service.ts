import { sanctuaryCoversCell } from '@app/services/gameplay/sanctuary-helpers';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { Position } from '@common/character';
import { ItemType } from '@common/items';
import { Service } from 'typedi';

@Service()
export class PositionValidatorService {
    private readonly directions: Position[] = [
        { x: 0, y: -1 },
        { x: -1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 0 },
    ];

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

    isWithinBounds(position: Position, currentActiveGame: IActiveGame): boolean {
        return (
            position.y >= 0 &&
            position.y < currentActiveGame.game.board.cells.length &&
            position.x >= 0 &&
            position.x < currentActiveGame.game.board.cells[0].length
        );
    }

    isOpenDoorTile(position: Position, currentActiveGame: IActiveGame): boolean {
        if (!this.isWithinBounds(position, currentActiveGame)) {
            return false;
        }

        return currentActiveGame.game.board.cells[position.y][position.x] === CellType.OpenDoor;
    }

    isStartingPoint(position: Position, currentActiveGame: IActiveGame): boolean {
        return currentActiveGame.game.board.items.some(
            (item) => item.itemType === ItemType.StartingPosition && item.x === position.x && item.y === position.y,
        );
    }

    isOtherPlayerStartingPoint(position: Position, carrierStart: Position, currentActiveGame: IActiveGame): boolean {
        return this.isStartingPoint(position, currentActiveGame) && (position.x !== carrierStart.x || position.y !== carrierStart.y);
    }

    isValidFlagDropTile(position: Position, currentActiveGame: IActiveGame): boolean {
        return (
            this.isWalkable(position, currentActiveGame) &&
            !this.isOccupiedByPlayer(position, currentActiveGame) &&
            !this.isStartingPoint(position, currentActiveGame)
        );
    }

    findClosestOpenFlagDropPosition(origin: Position, currentActiveGame: IActiveGame): Position | null {
        const queue: Position[] = [origin];
        const visited = new Set<string>([`${origin.x},${origin.y}`]);

        while (queue.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const current = queue.shift()!;

            if (
                (current.x !== origin.x || current.y !== origin.y) &&
                this.isTerrainTile(current, currentActiveGame) &&
                this.isValidFlagDropTile(current, currentActiveGame)
            ) {
                return current;
            }

            for (const direction of this.directions) {
                const next: Position = { x: current.x + direction.x, y: current.y + direction.y };
                if (!this.isWithinBounds(next, currentActiveGame)) {
                    continue;
                }

                const key = `${next.x},${next.y}`;
                if (visited.has(key)) {
                    continue;
                }

                visited.add(key);
                queue.push(next);
            }
        }

        return null;
    }

    resolveFlagDropPosition(desiredPosition: Position, carrierStart: Position, currentActiveGame: IActiveGame): Position {
        if (
            this.isOpenDoorTile(desiredPosition, currentActiveGame) ||
            this.isOtherPlayerStartingPoint(desiredPosition, carrierStart, currentActiveGame)
        ) {
            const closestOpen = this.findClosestOpenFlagDropPosition(desiredPosition, currentActiveGame);
            return closestOpen ?? desiredPosition;
        }

        return desiredPosition;
    }

    private isTerrainTile(position: Position, currentActiveGame: IActiveGame): boolean {
        if (!this.isWithinBounds(position, currentActiveGame)) {
            return false;
        }

        const cell = currentActiveGame.game.board.cells[position.y][position.x];
        return cell === CellType.Empty || cell === CellType.Water || cell === CellType.Ice;
    }
}
