import { Service } from 'typedi';
import { CombatService } from '@app/services/gameplay/combat-service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { MovementService } from '@app/services/gameplay/movement-service';
import { StartGameService } from '@app/services/gameplay/start-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';

@Service()
export class GameplayServices {
    constructor(
        public turnService: TurnService,
        public startGameService: StartGameService,
        public movementService: MovementService,
        public combatService: CombatService,
        public endGameService: EndGameService,
    ) {}
}
