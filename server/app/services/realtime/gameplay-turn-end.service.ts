import { ActionService } from '@app/services/gameplay/action-service';
import { ActiveGameGarbageCollectorService } from '@app/services/active-game/active-game-garbage-collector.service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { MovementService } from '@app/services/gameplay/movement-service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { toGameCanceledReason } from '@app/utils/game-cancellation';
import { SocketEvent } from '@common/socket-events';
import { IGameCanceledPayload, IGameLogPayload } from '@common/socket-payloads';
import { Namespace } from 'socket.io';
import { Service } from 'typedi';

@Service()
export class GameplayTurnEndService {
    constructor(
        private readonly movementService: MovementService,
        private readonly actionService: ActionService,
        private readonly turnService: TurnService,
        private readonly endGameService: EndGameService,
        private readonly activeGameGarbageCollectorService: ActiveGameGarbageCollectorService,
    ) {}

    async checkEndTurnIfNoMovesLeft(gameId: string, playerId: string): Promise<void> {
        const reachable = await this.movementService.getReachablePositions(playerId, gameId);
        const canAttackAnyPlayer = await this.actionService.canUseActionAnyPlayer(gameId, playerId);

        const canUseAnySanctuary = await this.actionService.canUseAnySanctuary(gameId, playerId);
        if (reachable.length === 0 && !canAttackAnyPlayer && !canUseAnySanctuary) {
            await this.turnService.endTurn(gameId);
        }
    }

    async emitGameEndedIfNeeded(gameId: string, namespace: Namespace): Promise<boolean> {
        const endGameResult = await this.endGameService.checkEndGame(gameId);
        if (!endGameResult.hasEnded) {
            return false;
        }

        if (endGameResult.completionType === 'canceled') {
            const gameCanceledPayload: IGameCanceledPayload = {
                reason: toGameCanceledReason(endGameResult.reason),
            };
            namespace.to(gameId).emit(SocketEvent.GameCanceled, gameCanceledPayload);
        } else {
            namespace.to(gameId).emit(SocketEvent.GameEnded, { winner: endGameResult.winner });
        }

        const logPayload: IGameLogPayload = {
            message: this.endGameService.getEndGameLogMessage(endGameResult),
            postedAt: new Date().toISOString(),
        };
        namespace.to(gameId).emit(SocketEvent.GameLog, logPayload);
        await this.activeGameGarbageCollectorService.reevaluateFinishedGameMark(gameId);
        return true;
    }
}
