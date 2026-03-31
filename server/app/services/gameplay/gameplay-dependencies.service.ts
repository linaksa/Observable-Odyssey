import { ActionService } from '@app/services/gameplay/action-service';
import { DoorService } from '@app/services/gameplay/door-service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { MovementService } from '@app/services/gameplay/movement-service';
import { SanctuaryService } from '@app/services/gameplay/sanctuary-service';
import { StartGameService } from '@app/services/gameplay/start-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { Container, Service } from 'typedi';

@Service()
export class GameplayServices {
    get turnService(): TurnService {
        return Container.get(TurnService);
    }

    get startGameService(): StartGameService {
        return Container.get(StartGameService);
    }

    get movementService(): MovementService {
        return Container.get(MovementService);
    }

    get actionService(): ActionService {
        return Container.get(ActionService);
    }

    get doorService(): DoorService {
        return Container.get(DoorService);
    }

    get sanctuaryService(): SanctuaryService {
        return Container.get(SanctuaryService);
    }

    get endGameService(): EndGameService {
        return Container.get(EndGameService);
    }
}
