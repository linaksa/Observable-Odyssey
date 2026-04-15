import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { IActiveGame } from '@common/active-game';
import { Position } from '@common/character';
import { MIN_PLAYER_COUNT, VICTORIES_TO_WIN } from '@common/constants';
import { GameType } from '@common/game';
import { ItemType } from '@common/items';
import { Service } from 'typedi';

export type EndGameVictoryReason = 'ctf-flag-returned' | 'combat-victories';
export type EndGameCancellationReason = 'insufficient-active-players' | 'no-human-players' | 'ctf-team-eliminated';
export type EndGameReason = EndGameVictoryReason | EndGameCancellationReason;
export type EndGameCompletionType = 'victory' | 'canceled' | null;

export interface EndGameCheckResult {
    hasEnded: boolean;
    winner: string | null;
    reason: EndGameReason | null;
    completionType: EndGameCompletionType;
    remainingPlayers: string[];
}

@Service()
export class EndGameService {
    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly turnService: TurnService,
        private readonly positionValidatorService: PositionValidatorService,
    ) {}

    async checkEndGame(gameId: string): Promise<EndGameCheckResult> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame || activeGame.isFinished) {
            return this.buildNotEndedResult(activeGame);
        }

        const activePlayers = activeGame.players.filter((p) => !p.hasAbandoned);

        const hasHumanPlayers = activePlayers.some((player) => !player.virtualPlayerProfile);
        if (!hasHumanPlayers) {
            activeGame.isFinished = true;
            activeGame.winner = null;
            activeGame.endedAt = new Date();
            await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
            return this.buildEndedResult(activeGame, 'no-human-players');
        }

        if (activeGame.game.gameMode === GameType.Classic && activePlayers.length === MIN_PLAYER_COUNT) {
            activeGame.isFinished = true;
            activeGame.winner = null;
            activeGame.endedAt = new Date();
            await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
            return this.buildEndedResult(activeGame, 'insufficient-active-players');
        }

        if (activeGame.game.gameMode === GameType.Ctf) {
            const redPlayers = activeGame.players.filter((p) => p.team === 'red' && !p.hasAbandoned);
            const bluePlayers = activeGame.players.filter((p) => p.team === 'blue' && !p.hasAbandoned);
            if (redPlayers.length === 0 || bluePlayers.length === 0) {
                activeGame.isFinished = true;
                activeGame.winner = null;
                activeGame.endedAt = new Date();
                await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
                return this.buildEndedResult(activeGame, 'ctf-team-eliminated');
            }
        }

        const winnerByCombat = activeGame.players.find((player) => {
            return this.getCombatWins(player) >= VICTORIES_TO_WIN;
        });

        const ctfWinner = this.checkCTFWinCondition(activeGame);

        // if a player in ctf mode has the flag and is on their starting tile, they win
        if (ctfWinner) {
            const flagHolder = activeGame.players.find((p) => p.name === activeGame.hasFlagId);
            activeGame.isFinished = true;
            activeGame.winner = flagHolder?.team ? `${flagHolder.team} team` : null;
            activeGame.endedAt = new Date();
            await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
            return this.buildEndedResult(activeGame, 'ctf-flag-returned');
        }
        // if a player has won enough combats, they win the game
        if (winnerByCombat) {
            activeGame.isFinished = true;
            activeGame.winner = winnerByCombat.name;
            activeGame.endedAt = new Date();
            await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);
            return this.buildEndedResult(activeGame, 'combat-victories');
        }

        return this.buildNotEndedResult(activeGame);
    }

    getEndGameLogMessage(result: EndGameCheckResult): string {
        const prefix = result.completionType === 'canceled' ? 'Partie annulée' : 'Fin de partie';
        const reason = this.getReasonLabel(result);
        const remainingPlayers = result.remainingPlayers.length > 0 ? result.remainingPlayers.join(', ') : 'aucun';
        return `${prefix}: ${reason}. Joueurs restants: ${remainingPlayers}.`;
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

        return flagHolder.currentPosition.x === flagHolder.startingPosition.x && flagHolder.currentPosition.y === flagHolder.startingPosition.y;
    }
    async checkIfOrganizer(gameId: string, playerId: string): Promise<boolean> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        if (!activeGame) return false;
        return activeGame.organizerName === playerId;
    }

    // handles a player's abandonment
    async handlePlayerAbandon(playerName: string, gameId: string): Promise<void> {
        const activeGame = await this.activeGameService.getActiveGameById(gameId);
        const playerIndex = activeGame?.players.findIndex((p) => p.name === playerName) ?? -1;
        if (!activeGame || playerIndex === -1) return;

        const player = activeGame.players[playerIndex];

        this.dropFlagIfCarrierAbandons(activeGame, playerName, player.currentPosition);

        player.hasAbandoned = true;
        await this.activeGameService.saveActiveGameById(activeGame._id, activeGame);

        const remainingActivePlayers = activeGame.players.filter((p) => !p.hasAbandoned).length;
        if (remainingActivePlayers <= MIN_PLAYER_COUNT) {
            return;
        }

        const currentPlayerName = activeGame.turnOrder[activeGame.currentPlayerIndex];

        // If the abandoning player was currently playing, skip immediately
        if (playerName === currentPlayerName) {
            await this.turnService.endTurn(gameId);
        }
    }

    private buildEndedResult(activeGame: IActiveGame, reason: EndGameReason): EndGameCheckResult {
        return {
            hasEnded: true,
            winner: activeGame.winner ?? null,
            reason,
            completionType: this.isCancellationReason(reason) ? 'canceled' : 'victory',
            remainingPlayers: this.getRemainingActivePlayerNames(activeGame),
        };
    }

    private buildNotEndedResult(activeGame?: IActiveGame): EndGameCheckResult {
        return {
            hasEnded: false,
            winner: activeGame?.winner ?? null,
            reason: null,
            completionType: null,
            remainingPlayers: activeGame ? this.getRemainingActivePlayerNames(activeGame) : [],
        };
    }

    private getReasonLabel(result: EndGameCheckResult): string {
        switch (result.reason) {
            case 'ctf-flag-returned':
                return 'le drapeau a ete ramene au point de depart';
            case 'combat-victories':
                return `${result.winner ?? 'Un joueur'} a atteint ${VICTORIES_TO_WIN} victoires de combat`;
            case 'insufficient-active-players':
                return 'il ne reste pas assez de joueurs actifs';
            case 'no-human-players':
                return 'il ne reste plus de joueurs humains';
            case 'ctf-team-eliminated':
                return "une equipe n'a plus de joueur actif";
            default:
                return 'la condition de fin est atteinte';
        }
    }

    private isCancellationReason(reason: EndGameReason): reason is EndGameCancellationReason {
        return reason === 'insufficient-active-players' || reason === 'no-human-players' || reason === 'ctf-team-eliminated';
    }

    private getRemainingActivePlayerNames(activeGame: IActiveGame): string[] {
        return activeGame.players.filter((player) => !player.hasAbandoned).map((player) => player.name);
    }

    private dropFlagIfCarrierAbandons(activeGame: IActiveGame, playerName: string, position: Position): void {
        if (activeGame.game.gameMode !== 'ctf' || activeGame.hasFlagId !== playerName) {
            return;
        }

        const carrier = activeGame.players.find((player) => player.name === playerName);
        if (!carrier) {
            return;
        }

        const flag = activeGame.game.board.items.find((item) => item.itemType === ItemType.Flag);
        if (!flag) {
            return;
        }

        const dropPosition = this.positionValidatorService.resolveFlagDropPosition(position, carrier.startingPosition, activeGame);

        activeGame.hasFlagId = '';
        flag.isCarried = false;
        flag.x = dropPosition.x;
        flag.y = dropPosition.y;
    }
}
