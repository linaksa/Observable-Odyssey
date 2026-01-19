import { GameService } from '@app/services/game.service';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Service } from 'typedi';

const HTTP_STATUS_NO_CONTENT = StatusCodes.NO_CONTENT;
const HTTP_STATUS_BAD_REQUEST = StatusCodes.BAD_REQUEST;
const HTTP_STATUS_NOT_FOUND = StatusCodes.NOT_FOUND;


@Service()
export class GameController {
    router: Router;

    constructor(private readonly gameService: GameService) {
        this.configureRouter();
    }

    private configureRouter(): void {
        this.router = Router();

        this.router.delete('/games/:id', async (req: Request, res: Response) => {
            const gameId = req.params.id;
            try {
                await this.gameService.deleteGame(gameId);
                res.sendStatus(HTTP_STATUS_NO_CONTENT);
            } catch (error) {
                res.status(HTTP_STATUS_NOT_FOUND).json({ message: error.message });
            }
        });

        this.router.put('/games/:id', async (req: Request, res: Response) => {
            try {
                const gameId = req.params.id;
                const gameData = req.body;
                const updatedGame = await this.gameService.updateGame(gameId, gameData);
                res.json(updatedGame);
            } catch (error) {
                res.status(HTTP_STATUS_BAD_REQUEST).json({ message: error.message });
            }
        });

        this.router.patch('/games/:id/visibility', async (req: Request, res: Response) => {
            try {
                const gameId = req.params.id;
                const visibility = req.body.visibility;
                const updatedGame = await this.gameService.changeVisibility(gameId, visibility);
                res.json(updatedGame);
            } catch (error) {
                res.status(HTTP_STATUS_BAD_REQUEST).json({ message: error.message });
            }
        });
    }


}
