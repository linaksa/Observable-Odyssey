import { ALL_EXCEPT_ONE_PLAYER_ABANDONED, VICTORIES_TO_WIN } from '@common/constants';
import { Service } from 'typedi';
import { ActiveGameService } from './active-game.service';
import { TurnService } from './turn-service';

@Service()
export class EndGameService {
    constructor(private readonly activeGameService: ActiveGameService, private readonly turnService: TurnService) {}

    async checkEndGame(gameId: string): Promise<boolean> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const winnerByCombat = activeGame.players.find((p) => p.victories === VICTORIES_TO_WIN);
        if (winnerByCombat) {
            activeGame.isFinished = true;
            activeGame.winner = winnerByCombat.name;
            await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
            return true;
        }
        // If the organizer abandoned before the game started (still on wait page), cancel the game
        const organizerAbandoned = activeGame.players.find((p) => p.name === activeGame.organizerName && p.hasAbandoned);
        if (organizerAbandoned && activeGame.turnOrder.length === 0) {
            activeGame.isFinished = true;
            activeGame.winner = null;
            await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
            return true;
        }
        // If only one active player remains, end the game
        const activePlayers = activeGame.players.filter((p) => !p.hasAbandoned);
        if (activePlayers.length === ALL_EXCEPT_ONE_PLAYER_ABANDONED) {
            activeGame.isFinished = true;
            activeGame.winner = null; // No clear winner, all other players have abandoned
            await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
            return true;
        }
        return false;
    }

    // handles a player's abandonment
    async handlePlayerAbandon(playerName: string, gameId: string): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const player = activeGame.players.find((p) => p.name === playerName);
        if (!player) return;

        player.hasAbandoned = true;

        const currentPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];

        // If the abandoning player was currently playing, skip immediately
        if (playerName === currentPlayerName) {
            await this.turnService.endTurn(gameId);
        }
        await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
    }
}
