import { AppError } from '@app/error-types/app-error';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { IActiveGame } from '@common/activeGame';
import { ICharacter, Position } from '@common/character';
import { ErrorCode } from '@common/error-codes';
import { SanctuaryChoice } from '@common/info';
import { IFightSanctuary, IItem, ILifeSanctuary, ItemType } from '@common/items';
import { ISanctuaryInteractedResult, ISanctuaryInteractionData } from '@common/socket-payloads';
import { StatusCodes } from 'http-status-codes';
import { Service } from 'typedi';
import {
    SANCTUARY_COOLDOWN_TURN_STEPS,
    advanceSanctuaryCooldowns,
    deactivateSanctuary,
    isPositionAdjacentToSanctuary,
    isSanctuaryActive,
    isSanctuaryItem,
    sanctuaryCoversCell,
} from './sanctuary-helpers';

const SANCTUARY_ACTION_COST = 1;
const LIFE_SANCTUARY_STANDARD_HEAL_AMOUNT = 2;
const LIFE_SANCTUARY_DOUBLE_HEAL_AMOUNT = 4;
const FIGHT_SANCTUARY_STANDARD_BONUS = 1;
const FIGHT_SANCTUARY_DOUBLE_BONUS = 2;
const FIGHT_SANCTUARY_BUFF_TURNS = 2;
const SANCTUARY_DOUBLE_CHANCE = 0.5;

@Service()
export class SanctuaryService {
    constructor(private readonly activeGameService: ActiveGameService) {}

    async interactSanctuary(
        playerName: string,
        activeGameId: string,
        data: Omit<ISanctuaryInteractionData, 'gameId' | 'playerId'>,
    ): Promise<ISanctuaryInteractedResult> {
        const activeGame = await this.getActiveGameOrThrow(activeGameId);
        const player = this.getPlayerOrThrow(activeGame, playerName);

        this.assertCanInteract(activeGame, player, playerName, data.position);

        const sanctuary = this.getSanctuaryOrThrow(activeGame, data.position);
        this.assertSanctuaryIsAvailable(sanctuary);
        this.assertAdjacentToSanctuary(player, sanctuary);
        this.assertFightSanctuaryIsAvailable(player, sanctuary);

        player.actionsLeft -= SANCTUARY_ACTION_COST;

        const result = this.createBaseResult(player, data.position, sanctuary.itemType, data.choice);

        if (sanctuary.itemType === ItemType.LifeSanctuary) {
            this.applyLifeSanctuary(player, data.choice, result);
        } else {
            this.applyFightSanctuary(player, data.choice, result);
        }

        deactivateSanctuary(sanctuary);
        result.sanctuaryActive = false;
        result.sanctuaryInactiveTurnsRemaining = SANCTUARY_COOLDOWN_TURN_STEPS;

        await this.activeGameService.saveActiveGameById(activeGameId, activeGame);
        return result;
    }

    onTurnStarted(activeGame: IActiveGame): void {
        advanceSanctuaryCooldowns(activeGame.game.board.items ?? []);
    }

    onTurnEnded(activeGame: IActiveGame, playerName: string): void {
        const player = this.getPlayerOrNull(activeGame, playerName);
        if (!player) {
            return;
        }

        const remainingTurns = player.fightSanctuaryTurnsRemaining ?? 0;
        const bonus = player.fightSanctuaryBonus ?? 0;

        if (remainingTurns <= 0 || bonus <= 0) {
            return;
        }

        player.fightSanctuaryTurnsRemaining = remainingTurns - 1;

        if (player.fightSanctuaryTurnsRemaining === 0) {
            player.fightSanctuaryBonus = 0;
        }
    }

    private async getActiveGameOrThrow(activeGameId: string): Promise<IActiveGame> {
        const activeGame = await this.activeGameService.getActiveGameById(activeGameId);

        if (!activeGame) {
            throw new AppError([ErrorCode.ActiveGameNotFound], StatusCodes.NOT_FOUND);
        }

        return activeGame;
    }

    private getPlayerOrThrow(activeGame: IActiveGame, playerName: string): ICharacter {
        const player = this.getPlayerOrNull(activeGame, playerName);

        if (!player) {
            throw new AppError([ErrorCode.PlayerNotFound], StatusCodes.NOT_FOUND);
        }

        return player;
    }

    private getPlayerOrNull(activeGame: IActiveGame, playerName: string): ICharacter | undefined {
        return activeGame.players.find((currentPlayer) => currentPlayer.name === playerName);
    }

    private assertCanInteract(activeGame: IActiveGame, player: { actionsLeft: number }, playerName: string, position: Position): void {
        const currentPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];

        this.throwIf(playerName !== currentPlayerName, [ErrorCode.NotYourTurn]);
        this.throwIf(activeGame.turnIsInPreparation, [ErrorCode.TurnNotStarted]);
        this.throwIf(player.actionsLeft < SANCTUARY_ACTION_COST, [ErrorCode.InsufficientActions]);
        this.throwIf(!this.isPositionWithinBounds(position, activeGame), [ErrorCode.InvalidSanctuaryTarget]);
    }

    private getSanctuaryOrThrow(activeGame: IActiveGame, position: Position): ILifeSanctuary | IFightSanctuary {
        const sanctuary = this.getSanctuaryAtPosition(activeGame, position);

        if (!sanctuary) {
            throw new AppError([ErrorCode.InvalidSanctuaryTarget], StatusCodes.BAD_REQUEST);
        }

        if (!isSanctuaryItem(sanctuary)) {
            throw new AppError([ErrorCode.InvalidSanctuaryTarget], StatusCodes.BAD_REQUEST);
        }

        return sanctuary;
    }

    private assertAdjacentToSanctuary(player: { positionGrille: Position }, sanctuary: IItem): void {
        this.throwIf(!isPositionAdjacentToSanctuary(player.positionGrille, sanctuary), [ErrorCode.SanctuaryAdjacencyRequired]);
    }

    private assertSanctuaryIsAvailable(sanctuary: IItem): void {
        this.throwIf(!isSanctuaryActive(sanctuary), [ErrorCode.SanctuaryInactive]);
    }

    private assertFightSanctuaryIsAvailable(player: ICharacter, sanctuary: IItem): void {
        this.throwIf(sanctuary.itemType === ItemType.FightSanctuary && this.hasFightSanctuaryAlreadyBeenUsed(player), [
            ErrorCode.FightSanctuaryAlreadyUsed,
        ]);
    }

    private createBaseResult(
        player: {
            name: string;
            actionsLeft: number;
            currentHealth: number;
            attackPoints: number;
            defensePoints: number;
            fightSanctuaryUsed?: boolean;
            fightSanctuaryTurnsRemaining?: number;
            fightSanctuaryBonus?: number;
        },
        position: Position,
        itemType: ItemType.LifeSanctuary | ItemType.FightSanctuary,
        choice: SanctuaryChoice,
    ): ISanctuaryInteractedResult {
        return {
            playerId: player.name,
            position,
            itemType,
            choice,
            succeeded: false,
            actionsLeft: player.actionsLeft,
            currentHealth: player.currentHealth,
            attackPoints: player.attackPoints,
            defensePoints: player.defensePoints,
            fightSanctuaryUsed: player.fightSanctuaryUsed ?? false,
            fightSanctuaryTurnsRemaining: player.fightSanctuaryTurnsRemaining ?? 0,
            fightSanctuaryBonus: player.fightSanctuaryBonus ?? 0,
            sanctuaryActive: false,
            sanctuaryInactiveTurnsRemaining: 0,
        };
    }

    private applyLifeSanctuary(
        player: { currentHealth: number; initialHealth: number },
        choice: SanctuaryChoice,
        result: ISanctuaryInteractedResult,
    ): void {
        const healAmount = this.resolveSanctuaryEffect(choice, LIFE_SANCTUARY_STANDARD_HEAL_AMOUNT, LIFE_SANCTUARY_DOUBLE_HEAL_AMOUNT);

        if (healAmount > 0) {
            player.currentHealth = Math.min(player.initialHealth, player.currentHealth + healAmount);
            result.succeeded = true;
        }

        result.currentHealth = player.currentHealth;
    }

    private applyFightSanctuary(player: ICharacter, choice: SanctuaryChoice, result: ISanctuaryInteractedResult): void {
        const bonus = this.resolveSanctuaryEffect(choice, FIGHT_SANCTUARY_STANDARD_BONUS, FIGHT_SANCTUARY_DOUBLE_BONUS);
        player.fightSanctuaryUsed = true;
        player.fightSanctuaryTurnsRemaining = bonus > 0 ? FIGHT_SANCTUARY_BUFF_TURNS : 0;
        player.fightSanctuaryBonus = bonus;

        if (bonus > 0) {
            result.succeeded = true;
        }

        result.attackPoints = player.attackPoints;
        result.defensePoints = player.defensePoints;
        result.fightSanctuaryUsed = true;
        result.fightSanctuaryTurnsRemaining = player.fightSanctuaryTurnsRemaining;
        result.fightSanctuaryBonus = player.fightSanctuaryBonus;
    }

    private resolveSanctuaryEffect(choice: SanctuaryChoice, standardAmount: number, doubleAmount: number): number {
        if (choice === 'standard') {
            return standardAmount;
        }

        return this.resolveDoubleOrNothing(doubleAmount);
    }

    private resolveDoubleOrNothing(amount: number): number {
        return Math.random() < SANCTUARY_DOUBLE_CHANCE ? amount : 0;
    }

    private hasFightSanctuaryAlreadyBeenUsed(player: ICharacter): boolean {
        return (player.fightSanctuaryUsed ?? false) || (player.fightSanctuaryTurnsRemaining ?? 0) > 0 || (player.fightSanctuaryBonus ?? 0) > 0;
    }

    private isPositionWithinBounds(position: Position, activeGame: IActiveGame): boolean {
        return (
            position.y >= 0 &&
            position.y < activeGame.game.board.cells.length &&
            position.x >= 0 &&
            position.x < activeGame.game.board.cells[position.y].length
        );
    }

    private getSanctuaryAtPosition(activeGame: IActiveGame, position: Position): IItem | null {
        const items = activeGame.game.board.items ?? [];
        return items.find((item) => sanctuaryCoversCell(item, position.y, position.x)) ?? null;
    }

    private throwIf(condition: boolean, errorCodes: ErrorCode[]): void {
        if (condition) {
            throw new AppError(errorCodes, StatusCodes.BAD_REQUEST);
        }
    }
}
