import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';
import { GameType } from '@common/game';
import { ItemType } from '@common/items';
import { Service } from 'typedi';
import { AgressivePlayerService } from './agressive-player.service';
import { VirtualPlayerUtilitiesService } from './virtual-player.utilities';

@Service()
export class CtfObjectiveService {
    constructor(
        private readonly virtualPlayerUtilities: VirtualPlayerUtilitiesService,
        private readonly aggressivePlayerService: AgressivePlayerService,
    ) {}

    async handleTurnObjective(character: ICharacter, game: IActiveGame): Promise<boolean> {
        if (game.game.gameMode !== GameType.Ctf) {
            return false;
        }

        if (game.hasFlagId === character.name) {
            const reachedSpawn = await this.virtualPlayerUtilities.moveToPosition(character, game, character.startingPosition);
            if (!reachedSpawn) {
                const enemyOnSpawn = game.players.find(
                    (player) =>
                        !player.hasAbandoned &&
                        player.team !== character.team &&
                        player.currentPosition.x === character.startingPosition.x &&
                        player.currentPosition.y === character.startingPosition.y,
                );
                await this.aggressivePlayerService.play(character, game, enemyOnSpawn?.name);
            }
            return true;
        }

        const flag = game.game.board.items.find((item) => item.itemType === ItemType.Flag);
        const flagIsFree = !game.hasFlagId && flag && !flag.isCarried;
        if (!flagIsFree) {
            return false;
        }

        await this.virtualPlayerUtilities.moveToPosition(character, game, { x: flag.x, y: flag.y });

        const pickedFlagThisTurn = game.hasFlagId === character.name;
        if (pickedFlagThisTurn && character.movementLeft > 0) {
            await this.virtualPlayerUtilities.moveToPosition(character, game, character.startingPosition);
        }

        return true;
    }
}
