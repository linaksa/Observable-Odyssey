import { IActiveGame } from '@common/activeGame';
import { ICharacter, VirtualPlayerProfile } from '@common/character';
import { Service } from 'typedi';
import { AgressivePlayerService } from './agressive-player.service';
import { CtfObjectiveService } from './ctf-objective.service';
import { DefensivePlayerService } from './defensive-player.service';
import { VirtualPlayerTurnFinalizerService } from './virtual-player-turn-finalizer.service';

@Service()
export class VirtualPlayerService {
    constructor(
        private readonly aggressivePlayerService: AgressivePlayerService,
        private readonly defensivePlayerService: DefensivePlayerService,
        private readonly ctfObjectiveService: CtfObjectiveService,
        private readonly turnFinalizerService: VirtualPlayerTurnFinalizerService,
    ) {}

    async startTurn(character: ICharacter, game: IActiveGame) {
        const gameId = game._id.toString();

        this.turnFinalizerService.beginTurn(gameId);

        try {
            const ctfObjectiveHandled = await this.ctfObjectiveService.handleTurnObjective(character, game);
            if (!ctfObjectiveHandled) {
                if (character.virtualPlayerProfile === VirtualPlayerProfile.Agressive) {
                    await this.agressiveTurn(character, game);
                } else if (character.virtualPlayerProfile === VirtualPlayerProfile.Defensive) {
                    await this.defensiveTurn(character, game);
                }
            }

            await this.turnFinalizerService.finalizeTurn(gameId);
        } finally {
            this.turnFinalizerService.finishTurn(gameId);
        }
    }

    private async agressiveTurn(character: ICharacter, game: IActiveGame) {
        await this.aggressivePlayerService.play(character, game);
    }

    private async defensiveTurn(character: ICharacter, game: IActiveGame) {
        await this.defensivePlayerService.play(character, game);
    }
}
