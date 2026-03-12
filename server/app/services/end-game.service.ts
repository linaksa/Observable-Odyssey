import { ALL_EXCEPT_ONE_PLAYER_ABANDONED, VICTORIES_TO_WIN } from '@common/constants';
import { Service } from 'typedi';
import { ActiveGameService } from './active-game.service';

@Service()
export class EndGameService {
    constructor(private readonly activeGameService: ActiveGameService) {}

    async checkEndGame(gameId: string): Promise<boolean> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const winnerByCombat = activeGame.players.find((p) => p.victories === VICTORIES_TO_WIN);
        if (winnerByCombat) {
            activeGame.isFinished = true;
            activeGame.winner = winnerByCombat.name;
            await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
            return true;
        }
        // If the organizer abandoned, end the game immediately
        const organizerAbandoned = activeGame.players.find((p) => p.name === activeGame.organizerName && p.hasAbandoned);
        if (organizerAbandoned) {
            activeGame.isFinished = true;
            activeGame.winner = null;
            await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
            return true;
        }
        // If only one active player remains, end the game
        const activePlayers = activeGame.players.filter((p) => !p.hasAbandoned);
        if (activePlayers.length === ALL_EXCEPT_ONE_PLAYER_ABANDONED) {
            activeGame.isFinished = true;
            activeGame.winner = activePlayers[0]?.name ?? null;
            await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
            return true;
        }
        return false;
    }

    // handles a player's abandonment
    async handlePlayerAbandon(playerName: string, gameId: string): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const player = activeGame.players.find((p) => p.name === playerName);
        if (player) {
            player.hasAbandoned = true;
        }
        await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
    }
}
