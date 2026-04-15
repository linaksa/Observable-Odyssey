import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { ActiveGameGarbageCollectorService } from '@app/services/active-game/active-game-garbage-collector.service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { toGameCanceledReason } from '@app/utils/game-cancellation';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { IGameCanceledPayload } from '@common/socket-payloads';
import { Container, Service } from 'typedi';

@Service()
export class VirtualPlayerTurnFinalizerService {
    private readonly activeTurnGameIds = new Set<string>();
    private readonly activeTurnPlayerNames = new Map<string, string>();

    constructor(
        private readonly endGameService: EndGameService,
        private readonly activeGameService: ActiveGameService,
        private readonly socketService: SocketService,
        private readonly turnService: TurnService,
        private readonly gameplayLogService: GameplayLogService,
    ) {}

    beginTurn(gameId: string, playerName: string): void {
        this.activeTurnGameIds.add(gameId);
        this.activeTurnPlayerNames.set(gameId, playerName);
    }

    finishTurn(gameId: string): void {
        this.activeTurnGameIds.delete(gameId);
        this.activeTurnPlayerNames.delete(gameId);
    }

    isTurnInProgress(gameId: string): boolean {
        return this.activeTurnGameIds.has(gameId);
    }

    async finalizeTurn(gameId: string): Promise<void> {
        const endGameResult = await this.endGameService.checkEndGame(gameId);
        if (endGameResult.hasEnded) {
            const gameNamespace = this.socketService.getNamespace(Namespaces.Game);
            if (endGameResult.completionType === 'canceled') {
                const gameCanceledPayload: IGameCanceledPayload = {
                    reason: toGameCanceledReason(endGameResult.reason),
                };
                gameNamespace.to(gameId).emit(SocketEvent.GameCanceled, gameCanceledPayload);
            } else {
                gameNamespace.to(gameId).emit(SocketEvent.GameEnded, { winner: endGameResult.winner });
            }
            this.gameplayLogService.emitGameLogToRoom(gameId, this.endGameService.getEndGameLogMessage(endGameResult));
            await this.getActiveGameGarbageCollectorService().reevaluateFinishedGameMark(gameId);
        }

        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (activeGame && activeGame.currentAttack) {
            return;
        }

        const activeTurnPlayerName = this.activeTurnPlayerNames.get(gameId);
        const currentPlayerName = activeGame?.turnOrder[activeGame.currentPlayerIndex];
        if (!activeTurnPlayerName || activeTurnPlayerName !== currentPlayerName) {
            return;
        }

        await this.turnService.endTurn(gameId);
    }

    private getActiveGameGarbageCollectorService(): ActiveGameGarbageCollectorService {
        return Container.get(ActiveGameGarbageCollectorService);
    }
}
