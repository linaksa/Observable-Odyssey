import { ValidationError } from '@app/error-types/validation-error';
import { AdminSocketsService } from '@app/services/admin-sockets.service';
import { GameService } from '@app/services/game.service';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Service } from 'typedi';

@Service()
export class GameController {
    router: Router;

    constructor(
        private readonly gameService: GameService,
        private readonly adminSocketService: AdminSocketsService,
    ) {
        this.configureRouter();
    }

    private getParamAsString(req: Request, key: string): string | null {
        const value = (req.params as Record<string, unknown>)[key];
        if (typeof value === 'string') return value;
        if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
        return null;
    }

    private configureRouter(): void {
        this.router = Router();

        /**
         * @swagger
         *
         * /api/games:
         *   get:
         *     description: Retrieve a list of all games
         *     tags:
         *       - Games
         *     produces:
         *       - application/json
         *     responses:
         *       200:
         *         description: List of games retrieved successfully
         *         content:
         *           application/json:
         *             schema:
         *               type: array
         *               items:
         *                 type: object
         *                 properties:
         *                   _id:
         *                     type: string
         *                   gameTitle:
         *                     type: string
         *                   description:
         *                     type: string
         *                   gameMode:
         *                     type: string
         *                     enum: [Ctf, Classic]
         *                   board:
         *                     type: object
         *                   preview:
         *                     type: string
         *                     description: Base64 encoded image
         *                   visibility:
         *                     type: string
         *                     enum: [Viewable, Hidden]
         *                   dateCreated:
         *                     type: string
         *                     format: date-time
         *                   lastModifiedDate:
         *                     type: string
         *                     format: date-time
         *       500:
         *         description: Internal server error
         */
        this.router.get('/', async (req: Request, res: Response) => {
            try {
                const games = await this.gameService.getAllGames();
                res.status(StatusCodes.OK).json(games);
            } catch {
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Erreur interne du serveur' });
            }
        });
        /**
         * @swagger
         *
         * /api/games/{id}:
         *   get:
         *     description: Retrieve a specific game by its unique ID
         *     tags:
         *       - Games
         *     produces:
         *       - application/json
         *     parameters:
         *       - in: path
         *         name: id
         *         description: Unique identifier of the game to retrieve
         *         required: true
         *         schema:
         *           type: string
         *     responses:
         *       200:
         *         description: Game retrieved successfully
         *         content:
         *           application/json:
         *             schema:
         *               type: object
         *               properties:
         *                 _id:
         *                   type: string
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
         *                 visibility:
         *                   type: string
         *                   enum: [Viewable, Hidden]
         *                 dateCreated:
         *                   type: string
         *                   format: date-time
         *                 lastModifiedDate:
         *                   type: string
         *                   format: date-time
         *       404:
         *         description: Game not found
         *       500:
         *         description: Internal server error
         */
        this.router.get('/:id', async (req: Request, res: Response) => {
            const gameId = this.getParamAsString(req, 'id');
            try {
                const existingGame = await this.gameService.getGame(gameId);
                if (!existingGame) {
                    return res.status(StatusCodes.NOT_FOUND).json({ message: 'Jeu introuvable' });
                }
                return res.json(existingGame);
            } catch {
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Erreur interne du serveur' });
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
         *       500:
         *         description: Internal server error
         */
        this.router.post('/', async (req: Request, res: Response) => {
            try {
                const newGame = await this.gameService.createGame(req.body.game);
                this.adminSocketService.emitNewData();
                return res.status(StatusCodes.CREATED).json(newGame);
            } catch (error) {
                if (error instanceof ValidationError) {
                    return res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
                }
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Erreur interne du serveur' });
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
         *       500:
         *         description: Internal server error
         */
        this.router.delete('/:id', async (req: Request, res: Response) => {
            const gameId = this.getParamAsString(req, 'id');
            try {
                await this.gameService.deleteGame(gameId);
                this.adminSocketService.emitNewData();
                return res.sendStatus(StatusCodes.NO_CONTENT);
            } catch (error) {
                if (error.message === 'Jeu déjà supprimé') {
                    return res.status(StatusCodes.NOT_FOUND).json({ error: error.message });
                }
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Erreur interne du serveur' });
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
         *                   description: image
         *     responses:
         *       200:
         *         description: Game updated successfully
         *       201:
         *         description: Game created successfully because it got deleted by another user in the meantime
         *       400:
         *         description: Invalid game data
         *       500:
         *         description: Internal server error
         */
        this.router.put('/:id', async (req: Request, res: Response) => {
            const gameId = this.getParamAsString(req, 'id');
            const gameData = req.body;
            try {
                const updatedGame = await this.gameService.updateGame(gameId, gameData);
                this.adminSocketService.emitNewData();
                if (updatedGame.created) {
                    return res.status(StatusCodes.CREATED).json(updatedGame.game);
                } else {
                    return res.status(StatusCodes.OK).json(updatedGame.game);
                }
            } catch (error) {
                if (error instanceof ValidationError) {
                    return res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
                } else {
                    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Erreur interne du serveur' });
                }
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
         *       500:
         *         description: Internal server error
         */
        this.router.patch('/:id/visibility', async (req: Request, res: Response) => {
            try {
                const gameId = this.getParamAsString(req, 'id');
                const visibility = req.body.visibility;
                const updatedGame = await this.gameService.changeVisibility(gameId, visibility);
                this.adminSocketService.emitNewData();
                return res.json(updatedGame);
            } catch (error) {
                if (error instanceof ValidationError) {
                    return res.status(StatusCodes.BAD_REQUEST).json({ error: error.message });
                }
                if (error.message === 'Jeu introuvable') {
                    return res.status(StatusCodes.NOT_FOUND).json({ error: error.message });
                }
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ error: 'Erreur interne du serveur' });
            }
        });
    }
}
