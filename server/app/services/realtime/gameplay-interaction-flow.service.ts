import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { DoorService } from '@app/services/gameplay/door-service';
import { SanctuaryService } from '@app/services/gameplay/sanctuary-service';
import { GameplayTurnEndService } from '@app/services/realtime/gameplay-turn-end.service';
import { sanctuaryCoversCell } from '@app/utils/sanctuary';
import { CellType } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { ItemType } from '@common/items';
import { SocketEvent } from '@common/socket-events';
import { IDoorToggleData, IDoorToggledResult, ISanctuaryInteractedResult, ISanctuaryInteractionData } from '@common/socket-payloads';
import { Namespace, Socket } from 'socket.io';
import { Service } from 'typedi';
import { toSocketError } from './socket-error';

@Service()
export class GameplayInteractionFlowService {
    constructor(
        private readonly doorService: DoorService,
        private readonly sanctuaryService: SanctuaryService,
        private readonly activeGameService: ActiveGameService,
        private readonly gameplayTurnEndService: GameplayTurnEndService,
    ) {}

    async handleToggleDoor(
        data: IDoorToggleData,
        socket: Socket | null,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        const { gameId, playerId, position } = data;
        try {
            const result: IDoorToggledResult = await this.doorService.toggleDoor(playerId, gameId, position);
            await this.trackManipulatedDoor(gameId, result.position.x, result.position.y);
            namespace.to(gameId).emit(SocketEvent.DoorToggled, result);
            emitGameLog(gameId, `${playerId} a ${result.cellType === CellType.OpenDoor ? 'ouvert' : 'ferme'} une porte.`);
            await this.gameplayTurnEndService.checkEndTurnIfNoMovesLeft(gameId, playerId);
        } catch (error) {
            socket?.emit(SocketEvent.DoorToggleError, toSocketError(error, ErrorCode.InvalidDoorTarget));
        }
    }

    async handleSanctuaryInteraction(
        data: ISanctuaryInteractionData,
        socket: Socket | null,
        namespace: Namespace,
        emitGameLog: (gameId: string, message: string) => void,
    ): Promise<void> {
        const { gameId, playerId, position, choice } = data;
        try {
            const result: ISanctuaryInteractedResult = await this.sanctuaryService.interactSanctuary(playerId, gameId, {
                position,
                choice,
            });
            await this.trackUsedSanctuary(gameId, position.x, position.y);
            namespace.to(gameId).emit(SocketEvent.SanctuaryInteracted, result);
            const sanctuaryKind = result.itemType === ItemType.LifeSanctuary ? 'vie' : 'combat';
            emitGameLog(gameId, `${playerId} a utilise un sanctuaire de ${sanctuaryKind}.`);
            await this.gameplayTurnEndService.checkEndTurnIfNoMovesLeft(gameId, playerId);
        } catch (error) {
            socket?.emit(SocketEvent.SanctuaryInteractionError, toSocketError(error, ErrorCode.InvalidSanctuaryTarget));
        }
    }

    private async trackManipulatedDoor(gameId: string, x: number, y: number): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) {
            return;
        }

        const doorKey = `${x},${y}`;
        if (!activeGame.manipulatedDoors.includes(doorKey)) {
            activeGame.manipulatedDoors.push(doorKey);
            await this.activeGameService.saveActiveGameById(gameId, activeGame);
        }
    }

    private async trackUsedSanctuary(gameId: string, x: number, y: number): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) {
            return;
        }

        const sanctuaryItem = activeGame.game.board.items.find((item) => sanctuaryCoversCell(item, y, x));
        if (!sanctuaryItem || (sanctuaryItem.itemType !== ItemType.LifeSanctuary && sanctuaryItem.itemType !== ItemType.FightSanctuary)) {
            return;
        }

        const sanctuaryKey = `${sanctuaryItem.itemType}:${sanctuaryItem.x},${sanctuaryItem.y}`;
        if (!activeGame.usedSanctuaries.includes(sanctuaryKey)) {
            activeGame.usedSanctuaries.push(sanctuaryKey);
            await this.activeGameService.saveActiveGameById(gameId, activeGame);
        }
    }
}
