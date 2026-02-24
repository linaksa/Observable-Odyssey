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
                const { gameId, characterForm } = req.body;
                if (!gameId || !characterForm) {
                    return res.status(StatusCodes.BAD_REQUEST).json({
                        message: 'gameId et characterForm sont requis',
                    });
                }
                const newActiveGame = await this.activeGameService.createActiveGame(gameId, characterForm);
                return res.status(StatusCodes.CREATED).json(newActiveGame);
            } catch (error) {
                if (error.message === 'Game introuvable') {
                    return res.status(StatusCodes.NOT_FOUND).json({ message: 'Jeu introuvable' });
                }
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Erreur interne du serveur', error });
            }
        });
        // route pour qu'un joueur puisse rejoindre une partie active existante
        this.router.patch('/join', async (req: Request, res: Response) => {
            try {
                const { activeGameId, characterForm } = req.body;
                if (!activeGameId || !characterForm) {
                    return res.status(StatusCodes.BAD_REQUEST).json({
                        message: 'activeGameId et characterForm sont requis',
                    });
                }
                const updatedActiveGame = await this.activeGameService.addPlayerToActiveGame(activeGameId, characterForm);
                return res.status(StatusCodes.OK).json(updatedActiveGame);
            } catch (error) {
                if (error.message === 'Active game not found') {
                    return res.status(StatusCodes.NOT_FOUND).json({ message: 'Partie active introuvable' });
                }
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Erreur interne du serveur', error });
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

        /**
         * @swagger
         *
         * /api/active-games:
         *   get:
         *     description: Retrieve a list of joinable active games
         *     tags:
         *       - Active Games
         *     produces:
         *       - application/json
         *     responses:
         *       200:
         *         description: List of joinable active games retrieved successfully
         *         content:
         *           application/json:
         *             schema:
         *               type: array
         *               items:
         *                 type: IactiveGame
         *       500:
         *         description: Internal server error
         */
        this.router.get('/joinable', async (req, res) => {
            try {
                const joinableActiveGames = await this.activeGameService.fetchJoinableActiveGames();
                res.status(StatusCodes.OK).json(joinableActiveGames);
            } catch {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Erreur interne du serveur' });
            }
        });
    }
}
