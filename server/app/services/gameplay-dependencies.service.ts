import { Service } from 'typedi';
import { CombatService } from './combat-service';
import { EndGameService } from './end-game.service';
import { MovementService } from './movement-service';
import { StartGameService } from './start-game.service';
import { TurnService } from './turn-service';

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
