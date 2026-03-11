import { ALL_EXCEPT_ONE_PLAYER_ABANDONED, VICTORIES_TO_WIN } from '@common/constants';
import { Service } from 'typedi';
import { ActiveGameService } from './active-game.service';

@Service()
export class EndGameService {
    constructor(private activeGameService: ActiveGameService) {}
    // verifie les conditions de fin de partie
    checkEndGame(gameId: string): boolean {
        const activeGame = this.activeGameService.getActiveGameFromMemory(gameId);
        // verifier si quelqu'un a plus que 3 victoires
        const winnerByCombat = activeGame.players.find((p) => p.victories === VICTORIES_TO_WIN);
        if (winnerByCombat) {
            activeGame.isFinished = true;
            activeGame.winner = winnerByCombat.name;
            return true;
        }
        // verifier si tous les joueurs sauf un ont abandonné
        const activePlayers = activeGame.players.filter((p) => !p.hasAbandoned);
        if (activePlayers.length === ALL_EXCEPT_ONE_PLAYER_ABANDONED) {
            activeGame.isFinished = true;
            activeGame.winner = null; // Pas de gagnant clair, tous les autres ont abandonné
            return true;
        }
        return false;
    }

    // gère l'abandon d'un joueur
    handlePlayerAbandon(playerName: string, gameId: string): void {
        const activeGame = this.activeGameService.getActiveGameFromMemory(gameId);
        const player = activeGame.players.find((p) => p.name === playerName);
        if (player) {
            player.hasAbandoned = true;
        }
    }
}
