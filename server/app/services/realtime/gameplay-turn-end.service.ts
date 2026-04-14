import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { ActionService } from '@app/services/gameplay/action-service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { MovementService } from '@app/services/gameplay/movement-service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { SocketEvent } from '@common/socket-events';
import { Namespace } from 'socket.io';
import { Service } from 'typedi';

@Service()
export class GameplayTurnEndService {
    constructor(
        private readonly movementService: MovementService,
        private readonly actionService: ActionService,
        private readonly turnService: TurnService,
        private readonly endGameService: EndGameService,
        private readonly activeGameService: ActiveGameService,
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
        const gameEnded = await this.endGameService.checkEndGame(gameId);
        if (!gameEnded) {
            return false;
        }

        const endedGame = await this.activeGameService.getActiveGameById(gameId);
        namespace.to(gameId).emit(SocketEvent.GameEnded, { winner: endedGame?.winner ?? null });
        return true;
    }
}
