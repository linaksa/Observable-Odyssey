import { ActiveGameService } from '@app/services/active-game.service';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Service } from 'typedi';

@Service()
export class ActiveGameController {
    router: Router;

    constructor(private readonly activeGameService: ActiveGameService) {
        this.configureRouter();
    }

    private configureRouter() {
        this.router = Router();

        this.router.post('/', async (req: Request, res: Response) => {
            try {
                const newActiveGame = await this.activeGameService.createActiveGame(req.body);
                res.status(StatusCodes.CREATED).json(newActiveGame);
            } catch (error) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Erreur interne du serveur', error });
            }
        });

        this.router.get('/', async (_req: Request, res: Response) => {
            try {
                const allActiveGames = await this.activeGameService.getAllActiveGames();
                res.status(StatusCodes.OK).json(allActiveGames);
            } catch (error) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    message: 'Erreur interne du serveur',
                    error,
                });
            }
        });
    }
}
