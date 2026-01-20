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
        /**
        * @swagger
        *
        * /api/games/{id}:
        *   delete:
        *     description: Delete a game by its unique MongoDB identifier
        *     tags:
        *       - Games
        *     produces:
        *       - application/json
        *     parameters:
        *       - in: path
        *         name: id
        *         description: Unique identifier of the game to delete
        *         required: true
        *         schema:
        *           type: string
        *     responses:
        *       204:
        *         description: Game deleted successfully
        *       404:
        *         description: Game not found or already deleted
        */
        this.router.delete('/:id', async (req: Request, res: Response) => {
            const gameId = req.params.id;
            try {
                await this.gameService.deleteGame(gameId);
                res.sendStatus(HTTP_STATUS_NO_CONTENT);
            } catch (error) {
                res.status(HTTP_STATUS_NOT_FOUND).json({ message: error.message });
            }
        });
        /**
         * @swagger
         *
         * /api/games/{id}:
         *   put:
         *     description: Update an existing game
         *     tags:
         *       - Games
         *     produces:
         *       - application/json
         *     parameters:
         *       - in: path
         *         name: id
         *         description: Unique identifier of the game to update
         *         required: true
         *         schema:
         *           type: string
         *       - in: body
         *         name: game
         *         description: Updated game data
         *         required: true
         *         schema:
         *           type: object
         *           required:
         *             - game
         *           properties:
         *             game:
         *               type: object
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
         *       200:
         *         description: Game updated successfully
         *       400:
         *         description: Invalid game data
         *       404:
         *         description: Game not found
         */
        this.router.put('/:id', async (req: Request, res: Response) => {
            try {
                const gameId = req.params.id;
                const gameData = req.body.game;
                const updatedGame = await this.gameService.updateGame(gameId, gameData);
                return res.json(updatedGame);
            } catch (error) {
                if (error.message === 'Jeu introuvable') {
                    return res.status(HTTP_STATUS_NOT_FOUND).json({ message: error.message });
                }
                return res.status(HTTP_STATUS_BAD_REQUEST).json({ message: error.message });
            }
        });
        /**
         * @swagger
         *
         * /api/games/{id}/visibility:
         *   patch:
         *     description: Change the visibility of a game
         *     tags:
         *       - Games
         *     produces:
         *       - application/json
         *     parameters:
         *       - in: path
         *         name: id
         *         description: Unique identifier of the game
         *         required: true
         *         schema:
         *           type: string
         *       - in: body
         *         name: visibility
         *         description: Visibility state of the game
         *         required: true
         *         schema:
         *           type: object
         *           required:
         *             - visibility
         *           properties:
         *             visibility:
         *               type: string
         *               enum: [hidden, viewable]
         *     responses:
         *       200:
         *         description: Game visibility updated successfully
         *       400:
         *         description: Invalid visibility value or request
         *       404:
         *         description: Game not found
         */
        this.router.patch('/:id/visibility', async (req: Request, res: Response) => {
            try {
                const gameId = req.params.id;
                const visibility = req.body.visibility;
                const updatedGame = await this.gameService.changeVisibility(gameId, visibility);
                return res.json(updatedGame);
            } catch (error) {
                if (error.message === 'Jeu introuvable') {
                    return res.status(HTTP_STATUS_NOT_FOUND).json({ message: error.message });
                }
                return res.status(HTTP_STATUS_BAD_REQUEST).json({ message: error.message });
            }
        });
    }


}


