import { AppError } from '@app/error-types/app-error';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { CombatService } from '@app/services/gameplay/combat-service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { isPositionAdjacentToSanctuary, isSanctuaryActive, isSanctuaryItem } from '@app/utils/sanctuary';
import { CombatOutcome } from '@common/attackResult';
import { ErrorCode } from '@common/error-codes';
import { IFlagActionData } from '@common/socket-payloads';
import { StatusCodes } from 'http-status-codes';
import { Service } from 'typedi';

@Service()
export class ActionService {
    constructor(
        private combatService: CombatService,
        private activeGameService: ActiveGameService,
        private positionValidatorService: PositionValidatorService,
    ) {}

    async isOnSameTeam(player1Name: string, player2Name: string, gameId: string): Promise<boolean> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const player1 = activeGame?.players.find((p) => p.name === player1Name);
        const player2 = activeGame?.players.find((p) => p.name === player2Name);
        if (!player1 || !player2) {
            throw new AppError([ErrorCode.PlayerNotFound], StatusCodes.NOT_FOUND);
        }
        return player1.team === player2.team;
    }

    async canTakeFlag(player2Name: string, gameId: string): Promise<boolean> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const targetHasFlag = activeGame?.hasFlagId === player2Name;
        if (targetHasFlag) {
            return true;
        }
        return false;
    }
    async giveFlag(gameId: string, player2Name: string): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        activeGame.hasFlagId = player2Name;
        if (!activeGame.flagHolderHistory.includes(player2Name)) {
            activeGame.flagHolderHistory.push(player2Name);
        }
        await this.activeGameService.saveActiveGameById(gameId, activeGame);
    }
    async takeFlag(gameId: string, player1Name: string): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        activeGame.hasFlagId = player1Name;
        if (!activeGame.flagHolderHistory.includes(player1Name)) {
            activeGame.flagHolderHistory.push(player1Name);
        }
        await this.activeGameService.saveActiveGameById(gameId, activeGame);
    }
    async flagActionRequest(player1Name: string, player2Name: string, gameId: string): Promise<IFlagActionData> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const player1 = activeGame?.players.find((p) => p.name === player1Name);
        player1.actionsLeft--;
        await this.activeGameService.saveActiveGameById(gameId, activeGame);
        const flagActionData: IFlagActionData = {
            gameId,
            currentPlayerName: player1Name,
            currentPlayerActionsLeft: player1.actionsLeft,
            targetPlayerName: player2Name,
        };
        return flagActionData;
    }

    async canGiveFlag(player1Name: string, gameId: string): Promise<boolean> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const player1HasFlag = activeGame?.hasFlagId === player1Name;
        if (player1HasFlag) {
            return true;
        }
        return false;
    }

    async canUseAction(gameId: string, player1Name: string, player2Name: string): Promise<boolean> {
        const currentActiveGame = await this.activeGameService.getActiveGameById(gameId);
        if (!currentActiveGame) {
            return false;
        }
        const currentPlayer = currentActiveGame.players.find((p) => p.name === player1Name);
        const target = currentActiveGame.players.find((p) => p.name === player2Name);
        if (!currentPlayer || !target) {
            return false;
        }
        if (currentPlayer.name === target.name) return false;
        if (currentPlayer.hasAbandoned || target.hasAbandoned) return false;

        const activePlayerName = currentActiveGame.turnOrder[currentActiveGame.currentPlayerIndex];
        if (activePlayerName !== currentPlayer.name) return false;
        if (currentPlayer.actionsLeft === 0) return false;
        if (!this.positionValidatorService.isAdjacent(currentPlayer.currentPosition, target.currentPosition)) return false;
        return true;
    }
    // calls canUseAction for each opponent to check if the attacker can use an action at least one of them
    async canUseActionAnyPlayer(activeGameId: string, attackerName: string): Promise<boolean> {
        const currentActiveGame = await this.activeGameService.getActiveGameById(activeGameId);
        if (!currentActiveGame) {
            return false;
        }

        for (const defender of currentActiveGame.players) {
            if (await this.canUseAction(activeGameId, attackerName, defender.name)) {
                return true;
            }
        }

        return false;
    }

    async canUseAnySanctuary(activeGameId: string, playerName: string): Promise<boolean> {
        const currentActiveGame = await this.activeGameService.getActiveGameById(activeGameId);
        if (!currentActiveGame) {
            return false;
        }

        const player = currentActiveGame.players.find((p) => p.name === playerName);
        if (!player) {
            return false;
        }

        if (player.actionsLeft === 0) return false;

        for (const item of Object.values(currentActiveGame.game.board.items)) {
            if (isSanctuaryItem(item) && isSanctuaryActive(item) && isPositionAdjacentToSanctuary(player.currentPosition, item)) {
                return true;
            }
        }

        return false;
    }

    async resolveCombat(gameId: string, attackerName: string, defenderName: string): Promise<CombatOutcome> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) {
            throw new AppError([ErrorCode.ActiveGameNotFound], StatusCodes.NOT_FOUND);
        }
        return this.combatService.resolveCombat(activeGame, attackerName, defenderName);
    }

    async applyCombatTurn(gameId: string): Promise<boolean> {
        return await this.combatService.applyCombatTurn(gameId);
    }

    async autoChooseVirtualPostures(gameId: string): Promise<void> {
        return await this.combatService.autoChooseVirtualPostures(gameId);
    }

    async combatTurnCanBeApplied(gameId: string): Promise<boolean> {
        return await this.combatService.combatTurnCanBeApplied(gameId);
    }
}
