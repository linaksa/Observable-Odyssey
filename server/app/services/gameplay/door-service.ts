import { Service } from 'typedi';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { Position } from '@common/character';
import { ItemType } from '@common/items';
import { IDoorToggledResult } from '@common/socket-payloads';

@Service()
export class DoorService {
    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly positionValidatorService: PositionValidatorService,
    ) {}

    async toggleDoor(playerName: string, activeGameId: string, position: Position): Promise<IDoorToggledResult> {
        const activeGame = await this.activeGameService.getActiveGameById(activeGameId);
        if (!activeGame) {
            throw new Error(`activeGame introuvable pour id=${activeGameId}`);
        }

        const player = activeGame.players.find((currentPlayer) => currentPlayer.name === playerName);
        if (!player) {
            throw new Error(`joueur '${playerName}' introuvable`);
        }

        const currentPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];
        if (playerName !== currentPlayerName) {
            throw new Error(`Ce n'est pas le tour de '${playerName}'`);
        }

        if (activeGame.turnIsInPreparation) {
            throw new Error(`Le tour de '${playerName}' n'a pas encore commencé`);
        }

        if (player.actionsLeft < 1) {
            throw new Error(`Actions insuffisantes (restant: ${player.actionsLeft}, coût: 1)`);
        }

        if (!this.positionValidatorService.isAdjacent(player.positionGrille, position)) {
            throw new Error(`Position non adjacente: de ${JSON.stringify(player.positionGrille)} vers ${JSON.stringify(position)}`);
        }

        if (!this.isPositionWithinBounds(position, activeGame)) {
            throw new Error('La porte ciblée est invalide');
        }

        if (this.isPlayerOnPosition(position, activeGame)) {
            throw new Error('La porte ciblée est occupée par un joueur');
        }

        if (this.isFlagOnPosition(position, activeGame)) {
            throw new Error('La porte ciblée est occupée par un drapeau');
        }

        const currentCell = activeGame.game.board.cells[position.y][position.x];
        if (currentCell !== CellType.OpenDoor && currentCell !== CellType.ClosedDoor) {
            throw new Error("La case ciblée n'est pas une porte");
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
                !currentPlayer.hasAbandoned && currentPlayer.positionGrille.x === position.x && currentPlayer.positionGrille.y === position.y,
        );
    }

    private isFlagOnPosition(position: Position, activeGame: IActiveGame): boolean {
        return activeGame.game.board.items.some(
            (item) => item.itemType === ItemType.Flag && !item.isCarried && item.x === position.x && item.y === position.y,
        );
    }
}
