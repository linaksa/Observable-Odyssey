import { ActionService } from '@app/services/gameplay/action-service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { MovementService } from '@app/services/gameplay/movement-service';
import { StartGameService } from '@app/services/gameplay/start-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { Service } from 'typedi';

@Service()
export class GameplayServices {
    constructor(
        public turnService: TurnService,
        public startGameService: StartGameService,
        public movementService: MovementService,
        public actionService: ActionService,
        public endGameService: EndGameService,
    ) {}
}
