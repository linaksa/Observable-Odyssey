import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { IActiveGame } from '@common/activeGame';
import { ALL_EXCEPT_ONE_PLAYER_ABANDONED, VICTORIES_TO_WIN } from '@common/constants';
import { ItemType } from '@common/items';
import { Service } from 'typedi';

@Service()
export class EndGameService {
    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly turnService: TurnService,
    ) {}

    async checkEndGame(gameId: string): Promise<boolean> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const winnerByCombat =
            activeGame.game.gameMode !== 'ctf'
                ? activeGame.players.find((player) => {
                      return this.getCombatWins(player) >= VICTORIES_TO_WIN;
                  })
                : undefined;
        const ctfWinner = this.checkCTFWinCondition(activeGame);
        // if a player in ctf mode has the flag and is on their starting tile, they win
        if (ctfWinner) {
            const flagHolder = activeGame.players.find((p) => p.name === activeGame.hasFlagId);
            activeGame.isFinished = true;
            activeGame.winner = flagHolder?.team ? `${flagHolder.team} team` : null;
            activeGame.endedAt = new Date();
            await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
            return true;
        }
        // if a player has won enough combats, they win the game
        if (winnerByCombat) {
            activeGame.isFinished = true;
            activeGame.winner = winnerByCombat.name;
            activeGame.endedAt = new Date();
            await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
            return true;
        }
        // If only one active player remains, end the game
        const activePlayers = activeGame.players.filter((p) => !p.hasAbandoned);
        if (activePlayers.length === ALL_EXCEPT_ONE_PLAYER_ABANDONED) {
            activeGame.isFinished = true;
            activeGame.winner = null; // No clear winner, all other players have abandoned
            activeGame.endedAt = new Date();
            await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
            return true;
        }

        const hasOneRealPlayer = activePlayers.find((player) => !player.virtualPlayerProfile);
        if (!hasOneRealPlayer) {
            return true;
        }
        // si une des 2 équipes n'a plus de joueurs actifs, l'autre équipe gagne (mode ctf)
        if (activeGame.game.gameMode === 'ctf') {
            const redPlayers = activeGame.players.filter((p) => p.team === 'red' && !p.hasAbandoned);
            const bluePlayers = activeGame.players.filter((p) => p.team === 'blue' && !p.hasAbandoned);
            if (redPlayers.length === 0) {
                activeGame.isFinished = true;
                activeGame.winner = 'blue team';
                activeGame.endedAt = new Date();
                await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
                return true;
            }
            if (bluePlayers.length === 0) {
                activeGame.isFinished = true;
                activeGame.winner = 'red team';
                activeGame.endedAt = new Date();
                await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
                return true;
            }
        }
        return false;
    }

    private getCombatWins(player: IActiveGame['players'][number]): number {
        const victories = Number.isFinite(player.victories) ? player.victories : 0;
        const countedVictories = Number.isFinite(player.nVictories) ? player.nVictories : 0;
        return Math.max(victories, countedVictories);
    }

    checkCTFWinCondition(activeGame: IActiveGame): boolean {
        if (activeGame.game.gameMode !== 'ctf') {
            return false;
        }
        const flagHolder = activeGame.players.find((p) => p.name === activeGame.hasFlagId);
        if (!flagHolder) {
            return false;
        }
        const isOnStartTile =
            flagHolder.positionGrille.x === flagHolder.positionDepart.x && flagHolder.positionGrille.y === flagHolder.positionDepart.y;

        if (isOnStartTile) {
            return true;
        }
        return false;
    }
    async checkIfOrganizer(gameId: string, playerId: string): Promise<boolean> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) return false;
        return activeGame.organizerName === playerId;
    }

    // handles a player's abandonment
    async handlePlayerAbandon(playerName: string, gameId: string): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const player = activeGame?.players.find((p) => p.name === playerName);
        if (!player) return;

        this.dropFlagIfCarrierAbandons(activeGame, playerName, player.positionGrille.x, player.positionGrille.y);

        const startingPosition = player.positionDepart;

        activeGame.game.board.items = activeGame.game.board.items.filter((item) => item.x !== startingPosition.x || item.y !== startingPosition.y);

        player.hasAbandoned = true;
        await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);

        const remainingActivePlayers = activeGame.players.filter((p) => !p.hasAbandoned).length;
        if (remainingActivePlayers <= ALL_EXCEPT_ONE_PLAYER_ABANDONED) {
            return;
        }

        const currentPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];

        // If the abandoning player was currently playing, skip immediately
        if (playerName === currentPlayerName) {
            await this.turnService.endTurn(gameId);
        }
    }

    private dropFlagIfCarrierAbandons(activeGame: IActiveGame, playerName: string, x: number, y: number): void {
        if (activeGame.game.gameMode !== 'ctf' || activeGame.hasFlagId !== playerName) {
            return;
        }

        const flag = activeGame.game.board.items.find((item) => item.itemType === ItemType.Flag);
        if (!flag) {
            return;
        }

        activeGame.hasFlagId = '';
        flag.isCarried = false;
        flag.x = x;
        flag.y = y;
    }
}
