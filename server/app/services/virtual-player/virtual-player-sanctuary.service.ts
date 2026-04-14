import { MovementService } from '@app/services/gameplay/movement-service';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { isPositionAdjacentToSanctuary, isSanctuaryActive } from '@app/utils/sanctuary';
import { IActiveGame } from '@common/active-game';
import { ICharacter, Position } from '@common/character';
import { SanctuaryChoice } from '@common/info';
import { IFightSanctuary, ILifeSanctuary, ItemType } from '@common/items';
import { Namespaces } from '@common/namespaces';
import { Service } from 'typedi';
import { VirtualPlayerUtilitiesService } from './virtual-player.utilities';

type SanctuaryTarget = {
    sanctuary: ILifeSanctuary | IFightSanctuary;
    targetPosition: Position;
};

@Service()
export class VirtualPlayerSanctuaryService {
    constructor(
        private readonly movementService: MovementService,
        private readonly virtualPlayerUtilities: VirtualPlayerUtilitiesService,
        private readonly gameplayActionService: GameplayActionService,
        private readonly gameplayLogService: GameplayLogService,
        private readonly socketService: SocketService,
    ) {}

    async tryFallbackObjective(character: ICharacter, game: IActiveGame): Promise<boolean> {
        const gameId = game._id.toString();
        const reachablePositions = await this.movementService.getReachablePositions(character.name, gameId);

        const lowHealthThreshold = character.initialHealth / 2;
        const isLowHealth = character.currentHealth <= lowHealthThreshold;
        if (isLowHealth && (await this.trySanctuaryType(character, game, reachablePositions, ItemType.LifeSanctuary))) {
            return true;
        }

        return await this.trySanctuaryType(character, game, reachablePositions, ItemType.FightSanctuary);
    }

    private async trySanctuaryType(
        character: ICharacter,
        game: IActiveGame,
        reachablePositions: Position[],
        sanctuaryType: ItemType.LifeSanctuary | ItemType.FightSanctuary,
    ): Promise<boolean> {
        if (sanctuaryType === ItemType.FightSanctuary && this.hasUsedFightSanctuary(character)) {
            return false;
        }

        const target = this.findBestSanctuaryTarget(character, game, reachablePositions, sanctuaryType);
        if (!target) {
            return false;
        }

        const alreadyAdjacent = isPositionAdjacentToSanctuary(character.currentPosition, target.sanctuary);
        if (!alreadyAdjacent) {
            const reachedTarget = await this.virtualPlayerUtilities.moveToPosition(character, game, target.targetPosition);
            if (!reachedTarget) {
                return false;
            }
        }

        if (character.actionsLeft <= 0) {
            return true;
        }

        const namespace = this.socketService.getNamespace(Namespaces.Game);
        const choice: SanctuaryChoice = SanctuaryChoice.Standard;
        await this.gameplayActionService.handleSanctuaryInteraction(
            {
                gameId: game._id.toString(),
                playerId: character.name,
                position: { x: target.sanctuary.x, y: target.sanctuary.y },
                choice,
            },
            null,
            namespace,
            (gameId: string, message: string) => this.gameplayLogService.emitGameLogToRoom(gameId, message),
        );

        return true;
    }

    private findBestSanctuaryTarget(
        character: ICharacter,
        game: IActiveGame,
        reachablePositions: Position[],
        sanctuaryType: ItemType.LifeSanctuary | ItemType.FightSanctuary,
    ): SanctuaryTarget | null {
        const sanctuaries = game.game.board.items.filter(
            (item): item is ILifeSanctuary | IFightSanctuary => item.itemType === sanctuaryType && isSanctuaryActive(item),
        );

        let bestTarget: SanctuaryTarget | null = null;
        let bestDistance = Infinity;
        for (const sanctuary of sanctuaries) {
            const targetPosition = this.findBestReachableAdjacentPosition(character.currentPosition, sanctuary, reachablePositions);
            if (!targetPosition) {
                continue;
            }

            const distance = this.manhattanDistance(character.currentPosition, targetPosition);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestTarget = { sanctuary, targetPosition };
            }
        }

        return bestTarget;
    }

    private findBestReachableAdjacentPosition(
        currentPosition: Position,
        sanctuary: ILifeSanctuary | IFightSanctuary,
        reachablePositions: Position[],
    ): Position | null {
        if (isPositionAdjacentToSanctuary(currentPosition, sanctuary)) {
            return currentPosition;
        }

        let bestPosition: Position | null = null;
        let bestDistance = Infinity;

        for (const position of reachablePositions) {
            if (!isPositionAdjacentToSanctuary(position, sanctuary)) {
                continue;
            }

            const distance = this.manhattanDistance(currentPosition, position);
            if (distance < bestDistance) {
                bestDistance = distance;
                bestPosition = position;
            }
        }

        return bestPosition;
    }

    private hasUsedFightSanctuary(character: ICharacter): boolean {
        return (character.fightSanctuaryUsed ?? false) || (character.fightSanctuaryTurnsRemaining ?? 0) > 0;
    }

    private manhattanDistance(a: Position, b: Position): number {
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }
}
