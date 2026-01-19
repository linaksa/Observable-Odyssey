import { game, IGame } from '@app/schemas/game';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Service } from 'typedi';

@Service()
export class GameController {
    router: Router;

    constructor() {
        this.configureRouter();
    }

    private configureRouter(): void {
        this.router = Router();

        this.router.post('/', async (req: Request, res: Response) => {
            const gameObject: IGame = req.body.game;

            if (!gameObject.description.length || gameObject.description.length == 0) {
                res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing description information" });
                return;
            }

            if (!gameObject.gameTitle.length || gameObject.gameTitle.length == 0) {
                res.status(StatusCodes.BAD_REQUEST).json({ error: "Missing title information" });
                return;
            }

            if (!gameObject.gameMode == gamemi)
                game.create
        });
    }


}