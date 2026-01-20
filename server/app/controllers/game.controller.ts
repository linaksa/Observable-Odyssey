import { GameService } from '@app/services/game.service';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Service } from 'typedi';

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


    }


}