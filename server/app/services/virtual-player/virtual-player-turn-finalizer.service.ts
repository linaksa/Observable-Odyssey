import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { SocketService } from '@app/services/realtime/socket.service';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Service } from 'typedi';

@Service()
export class VirtualPlayerTurnFinalizerService {
    constructor(
        private readonly endGameService: EndGameService,
        private readonly activeGameService: ActiveGameService,
        private readonly socketService: SocketService,
        private readonly turnService: TurnService,
    ) {}

    async finalizeTurn(gameId: string): Promise<void> {
        const gameEnded = await this.endGameService.checkEndGame(gameId);
        if (gameEnded) {
            const endedGame = await this.activeGameService.getActiveGameById(gameId);
            if (endedGame?.isFinished) {
                this.socketService.getNamespace(Namespaces.Game).to(gameId).emit(SocketEvent.GameEnded, { winner: endedGame.winner });
            }
        }

        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (activeGame && activeGame.currentAttack) {
            return;
        }

        await this.turnService.endTurn(gameId);
    }
}
