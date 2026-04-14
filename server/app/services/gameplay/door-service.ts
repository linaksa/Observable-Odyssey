import { AppError } from '@app/error-types/app-error';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { Position } from '@common/character';
import { ErrorCode } from '@common/error-codes';
import { ItemType } from '@common/items';
import { IDoorToggledResult } from '@common/socket-payloads';
import { StatusCodes } from 'http-status-codes';
import { Service } from 'typedi';

@Service()
export class DoorService {
    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly positionValidatorService: PositionValidatorService,
    ) {}

    async toggleDoor(playerName: string, activeGameId: string, position: Position): Promise<IDoorToggledResult> {
        const activeGame = await this.activeGameService.getActiveGameById(activeGameId);
        if (!activeGame) {
            throw new AppError([ErrorCode.ActiveGameNotFound], StatusCodes.NOT_FOUND);
        }

        const player = activeGame.players.find((currentPlayer) => currentPlayer.name === playerName);
        if (!player) {
            throw new AppError([ErrorCode.PlayerNotFound], StatusCodes.NOT_FOUND);
        }

        const currentPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
        if (playerName !== currentPlayerName) {
            throw new AppError([ErrorCode.NotYourTurn], StatusCodes.BAD_REQUEST);
        }

        if (activeGame.turnIsInPreparation) {
            throw new AppError([ErrorCode.TurnNotStarted], StatusCodes.BAD_REQUEST);
        }

        if (player.actionsLeft < 1) {
            throw new AppError([ErrorCode.InsufficientActions], StatusCodes.BAD_REQUEST);
        }

        if (!this.positionValidatorService.isAdjacent(player.currentPosition, position)) {
            throw new AppError([ErrorCode.PositionNotAdjacent], StatusCodes.BAD_REQUEST);
        }

        if (!this.isPositionWithinBounds(position, activeGame)) {
            throw new AppError([ErrorCode.InvalidDoorTarget], StatusCodes.BAD_REQUEST);
        }

        if (this.isPlayerOnPosition(position, activeGame)) {
            throw new AppError([ErrorCode.DoorTargetOccupiedByPlayer], StatusCodes.BAD_REQUEST);
        }

        if (this.isFlagOnPosition(position, activeGame)) {
            throw new AppError([ErrorCode.DoorTargetOccupiedByFlag], StatusCodes.BAD_REQUEST);
        }

        const currentCell = activeGame.game.board.cells[position.y][position.x];
        if (currentCell !== CellType.OpenDoor && currentCell !== CellType.ClosedDoor) {
            throw new AppError([ErrorCode.TargetIsNotDoor], StatusCodes.BAD_REQUEST);
        }

        const nextCell = currentCell === CellType.OpenDoor ? CellType.ClosedDoor : CellType.OpenDoor;
        activeGame.game.board.cells[position.y][position.x] = nextCell;
        player.actionsLeft -= 1;

        await this.activeGameService.saveActiveGameById(activeGameId, activeGame);

        return {
            playerId: player.name,
            position,
            cellType: nextCell,
            actionsLeft: player.actionsLeft,
        };
    }

    private isPositionWithinBounds(position: Position, activeGame: IActiveGame): boolean {
        return (
            position.y >= 0 &&
            position.y < activeGame.game.board.cells.length &&
            position.x >= 0 &&
            position.x < activeGame.game.board.cells[position.y].length
        );
    }

    private isPlayerOnPosition(position: Position, activeGame: IActiveGame): boolean {
        return activeGame.players.some(
            (currentPlayer) =>
                !currentPlayer.hasAbandoned && currentPlayer.currentPosition.x === position.x && currentPlayer.currentPosition.y === position.y,
        );
    }

    private isFlagOnPosition(position: Position, activeGame: IActiveGame): boolean {
        return activeGame.game.board.items.some(
            (item) => item.itemType === ItemType.Flag && !item.isCarried && item.x === position.x && item.y === position.y,
        );
    }
}
