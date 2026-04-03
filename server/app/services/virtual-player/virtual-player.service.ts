import { EndGameService } from '@app/services/gameplay/end-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { IActiveGame } from '@common/activeGame';
import { ICharacter, VirtualPlayerProfile } from '@common/character';
import { Service } from 'typedi';
import { AgressivePlayerService } from './agressive-player.service';
import { DefensivePlayerService } from './defensive-player.service';

@Service()
export class VirtualPlayerService {
    constructor(
        private readonly aggressivePlayerService: AgressivePlayerService,
        private readonly defensivePlayerService: DefensivePlayerService,
        private readonly endGameService: EndGameService,
        private readonly turnService: TurnService,
    ) {}

    async startTurn(character: ICharacter, game: IActiveGame) {
        const gameId = game._id.toString();

        if (character.virtualPlayerProfile === VirtualPlayerProfile.Agressive) {
            await this.agressiveTurn(character, game);
        } else if (character.virtualPlayerProfile === VirtualPlayerProfile.Defensive) {
            await this.defensiveTurn(character, game);
        }

        const gameEnded = await this.endGameService.checkEndGame(gameId);
        if (gameEnded) {
            return;
        }

        await this.turnService.endTurn(gameId);
    }

    private async agressiveTurn(character: ICharacter, game: IActiveGame) {
        await this.aggressivePlayerService.play(character, game);
    }

    private async defensiveTurn(character: ICharacter, game: IActiveGame) {
        await this.defensivePlayerService.play(character, game);
    }
}
