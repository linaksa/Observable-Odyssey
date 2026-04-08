import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';
import { GameType } from '@common/game';
import { Namespaces } from '@common/namespaces';
import { Service } from 'typedi';
import { VirtualPlayerSanctuaryService } from './virtual-player-sanctuary.service';
import { VirtualPlayer } from './virtual-player.interface';
import { sleep, VirtualPlayerUtilitiesService } from './virtual-player.utilities';

@Service()
export class AgressivePlayerService implements VirtualPlayer {
    constructor(
        private readonly virtualPlayerUtilities: VirtualPlayerUtilitiesService,
        private readonly gameplayActionService: GameplayActionService,
        private readonly socketService: SocketService,
        private readonly sanctuaryService: VirtualPlayerSanctuaryService,
        private readonly positionValidatorService: PositionValidatorService,
    ) {}

    async play(character: ICharacter, game: IActiveGame, forcedTargetName?: string): Promise<void> {
        const enemyFlagCarrier =
            game.game.gameMode === GameType.Ctf && game.hasFlagId
                ? game.players.find((player) => player.name === game.hasFlagId && player.team !== character.team && !player.hasAbandoned)
                : undefined;

        const forcedTarget = forcedTargetName
            ? game.players.find((player) => player.name === forcedTargetName && player.name !== character.name && !player.hasAbandoned)
            : undefined;

        const adverserPlayers = forcedTarget
            ? [forcedTarget]
            : enemyFlagCarrier
              ? [enemyFlagCarrier]
              : game.players.filter((player) => {
                    if (player.name === character.name || player.hasAbandoned) {
                        return false;
                    }
                    if (game.game.gameMode !== GameType.Ctf) {
                        return true;
                    }

                    return player.team !== character.team;
                });

        const closestAdversePlayer = this.virtualPlayerUtilities.findClosestReachablePlayer(
            character,
            adverserPlayers,
            game.game.board.cells,
            game.game.board.items,
        );
        if (!closestAdversePlayer) {
            if (game.game.gameMode !== GameType.Ctf) {
                await this.sanctuaryService.tryFallbackObjective(character, game);
            }
            return;
        }

        await this.virtualPlayerUtilities.moveToPlayer(character, game, closestAdversePlayer.bestAdjacentIndex);

        const refreshedPlayer = game.players.find((player) => player.name === character.name);
        if (!refreshedPlayer) {
            return;
        }

        await this.attackTargetIfPossible(refreshedPlayer, game, closestAdversePlayer.player.name);
    }

    async attackTargetIfPossible(character: ICharacter, game: IActiveGame, targetName: string): Promise<void> {
        const target = game.players.find((player) => player.name === targetName && !player.hasAbandoned);
        if (!target) {
            return;
        }

        if (!this.positionValidatorService.isAdjacent(target.positionGrille, character.positionGrille)) {
            return;
        }

        const namespace = this.socketService.getNamespace(Namespaces.Game);

        await sleep();
        await this.gameplayActionService.combatManager(game._id.toString(), character.name, targetName, namespace);
    }
}
