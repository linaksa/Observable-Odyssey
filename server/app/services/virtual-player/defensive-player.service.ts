import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';
import { GameType } from '@common/game';
import { Service } from 'typedi';
import { VirtualPlayer } from './virtual-player.interface';
import { VirtualPlayerUtilitiesService } from './virtual-player.utilities';

@Service()
export class DefensivePlayerService implements VirtualPlayer {
    constructor(private readonly virtualPlayerUtilities: VirtualPlayerUtilitiesService) {}

    async play(character: ICharacter, game: IActiveGame): Promise<void> {
        let adverserPlayers = game.players;
        if (game.game.gameMode === GameType.Ctf) {
            adverserPlayers = game.players; // TODO: add CTF team filtering logic here
        }
        const closestAdversePlayer = this.virtualPlayerUtilities.findClosestReachablePlayer(
            character,
            adverserPlayers,
            game.game.board.cells,
            game.game.board.items,
        );
        if (closestAdversePlayer) {
            await this.virtualPlayerUtilities.moveToPlayer(character, game, closestAdversePlayer.bestAdjacentIndex);
        } else {
            // No reachable player! Implement fallback behavior here
        }
    }
}
