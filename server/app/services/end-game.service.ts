import { activeGameModel } from '@app/schemas/active-game';
import { ALL_EXCEPT_ONE_PLAYER_ABANDONED, VICTORIES_TO_WIN } from '@common/constants';
import { Service } from 'typedi';


@Service()
export class EndGameService {
    async checkEndGame(gameId: string): Promise<boolean> {
        const activeGame = await activeGameModel.findById(gameId);
        const winnerByCombat = activeGame.players.find((p) => p.victories === VICTORIES_TO_WIN);
        if (winnerByCombat) {
            activeGame.isFinished = true;
            activeGame.winner = winnerByCombat.name;
            activeGame.save();
            return true;
        }
        // check if all players except one have abandoned
        const activePlayers = activeGame.players.filter((p) => !p.hasAbandoned);
        if (activePlayers.length === ALL_EXCEPT_ONE_PLAYER_ABANDONED) {
            activeGame.isFinished = true;
            activeGame.winner = null; // No clear winner, all other players have abandoned
            activeGame.save();
            return true;
        }
        return false;
    }

    // handles a player's abandonment
    async handlePlayerAbandon(playerName: string, gameId: string): Promise<void> {
        const activeGame = await activeGameModel.findById(gameId);
        const player = activeGame.players.find((p) => p.name === playerName);
        if (player) {
            player.hasAbandoned = true;
        }
        activeGame.save();
    }
}
