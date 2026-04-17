import { IActiveGame } from '@common/active-game';
import { ICharacter } from '@common/character';
import { GameType } from '@common/game';
import { Service } from 'typedi';
import { AgressivePlayerService } from '@app/services/virtual-player/agressive-player.service';
import { VirtualPlayerSanctuaryService } from '@app/services/virtual-player/virtual-player-sanctuary.service';
import { VirtualPlayer } from '@app/services/virtual-player/virtual-player.interface';
import { VirtualPlayerUtilitiesService } from '@app/services/virtual-player/virtual-player.utilities';

@Service()
export class DefensivePlayerService implements VirtualPlayer {
    constructor(
        private readonly virtualPlayerUtilities: VirtualPlayerUtilitiesService,
        private readonly aggressivePlayerService: AgressivePlayerService,
        private readonly sanctuaryService: VirtualPlayerSanctuaryService,
    ) {}

    async play(character: ICharacter, game: IActiveGame): Promise<void> {
        const enemyCarrier = this.getEnemyFlagCarrier(character, game);
        if (enemyCarrier) {
            await this.tryBlockEnemyFlagCarrier(character, game, enemyCarrier);
            return;
        }

        const adversePlayers = game.players.filter((player) => {
            if (player.name === character.name || player.hasAbandoned) {
                return false;
            }

            if (game.game.gameMode !== GameType.Ctf) {
                return true;
            }

            return player.team !== character.team;
        });

        if (adversePlayers.length === 0) {
            if (game.game.gameMode !== GameType.Ctf) {
                const success = await this.sanctuaryService.tryFallbackObjective(character, game);
                if (success) return; // return if player managed to get to a sanctuary, else move towards closest player
            }
        }

        await this.virtualPlayerUtilities.moveAwayFromPlayers(character, game, adversePlayers);
    }

    private getEnemyFlagCarrier(character: ICharacter, game: IActiveGame): ICharacter | undefined {
        if (game.game.gameMode !== GameType.Ctf || !game.hasFlagId) {
            return undefined;
        }

        return game.players.find((player) => player.name === game.hasFlagId && player.team !== character.team && !player.hasAbandoned);
    }

    private async tryBlockEnemyFlagCarrier(character: ICharacter, game: IActiveGame, enemyCarrier: ICharacter): Promise<void> {
        await this.virtualPlayerUtilities.moveToPositionOrNearest(character, game, enemyCarrier.startingPosition);
        await this.aggressivePlayerService.attackTargetIfPossible(character, game, enemyCarrier.name);
    }
}
