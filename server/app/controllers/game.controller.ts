import { GameService } from '@app/services/game.service';
import { Request, Response, GameService } from '@app/services/game.service';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { StatusCodes } from 'http-status-codes';
import { Service } from 'typedi';

const HTTP_STATUS_NO_CONTENT = StatusCodes.NO_CONTENT;
const HTTP_STATUS_BAD_REQUEST = StatusCodes.BAD_REQUEST;
const HTTP_STATUS_NOT_FOUND = StatusCodes.NOT_FOUND;


const HTTP_STATUS_NO_CONTENT = StatusCodes.NO_CONTENT;
const HTTP_STATUS_BAD_REQUEST = StatusCodes.BAD_REQUEST;
const HTTP_STATUS_NOT_FOUND = StatusCodes.NOT_FOUND;


@Service()
export class GameController {
    router: Router;

    constructor(private readonly gameService: GameServiceprivate readonly gameService: GameService) {
        this.configureRouter();
    }

    private configureRouter(): void {
        this.router = Router();

        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const games = await this.gameService.getAllGames();
                res.status(StatusCodes.OK).json(games);
            }
            catch (error) {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Erreur interne du serveur' });
            }
        });

        /**
         * @swagger
         *
         * /api/games:
         *   post:
         *     description: Create a new game with board configuration
         *     tags:
         *       - Games
         *     produces:
         *       - application/json
         *     parameters:
         *       - in: body
         *         name: game
         *         description: Game object containing title, description, mode, board and preview image
         *         required: true
         *         schema:
         *           type: object
         *           required:
         *             - game
         *           properties:
         *             game:
         *               type: object
         *               required:
         *                 - gameTitle
         *                 - description
         *                 - gameMode
         *                 - board
         *                 - preview
         *               properties:
         *                 gameTitle:
         *                   type: string
         *                 description:
         *                   type: string
         *                 gameMode:
         *                   type: string
         *                   enum: [Ctf, Classic]
         *                 board:
         *                   type: object
         *                 preview:
         *                   type: string
         *                   description: Base64 encoded image
         *     responses:
         *       201:
         *         description: Game created successfully
         *       400:
         *         description: Invalid game data
         */
        this.router.post('/', async (req: Request, res: Response) => {
            try {
                const newGame = await this.gameService.createGame(req.body.game);
                res.status(StatusCodes.CREATED).json(newGame);
            } catch (error) {
                res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
            }
        });

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


