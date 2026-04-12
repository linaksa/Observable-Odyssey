import { MovementService } from '@app/services/gameplay/movement-service';
import { GameplayTurnEndService } from '@app/services/realtime/gameplay-turn-end.service';
import { ErrorCode } from '@common/error-codes';
import { PlayerMovedResult } from '@common/playerMovedResult';
import { SocketEvent } from '@common/socket-events';
import { IPlayerMoveData } from '@common/socket-payloads';
import { Namespace, Socket } from 'socket.io';
import { Service } from 'typedi';
import { toSocketError } from './socket-error';

@Service()
export class GameplayMovementFlowService {
    constructor(
        private readonly movementService: MovementService,
        private readonly gameplayTurnEndService: GameplayTurnEndService,
    ) {}

    async handlePlayerMove(data: IPlayerMoveData, socket: Socket, namespace: Namespace): Promise<void> {
        const { gameId, playerId, direction } = data;
        try {
            const { newPosition, movementLeft } = await this.movementService.movePlayer(playerId, gameId, direction);
            namespace.to(gameId).emit(SocketEvent.PlayerMoved, { playerId, newPosition, movementLeft } as PlayerMovedResult);

            await this.gameplayTurnEndService.checkEndTurnIfNoMovesLeft(gameId, playerId);
            await this.gameplayTurnEndService.emitGameEndedIfNeeded(gameId, namespace);
        } catch (error) {
            socket.emit(SocketEvent.PlayerMoveError, toSocketError(error, ErrorCode.PositionNotWalkable));
        }
    }

    async checkEndTurnIfNoMovesLeft(gameId: string, playerId: string): Promise<void> {
        await this.gameplayTurnEndService.checkEndTurnIfNoMovesLeft(gameId, playerId);
    }

    async emitGameEndedIfNeeded(gameId: string, namespace: Namespace): Promise<boolean> {
        return await this.gameplayTurnEndService.emitGameEndedIfNeeded(gameId, namespace);
    }
}
