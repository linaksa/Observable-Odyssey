import { AppError } from '@app/error-types/app-error';
import { toErrorResponse } from '@app/error-types/error-response';
import { ActiveGameListSocketsService } from '@app/services/active-game/active-game-list-sockets.service';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { GameSocketsService } from '@app/services/realtime/game-sockets.service';
import { IActiveGameWithPlayer } from '@common/active-game';
import { ErrorCode } from '@common/error-codes';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Service } from 'typedi';

@Service()
export class ActiveGameController {
    router: Router;

    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly activeGameListSocketsService: ActiveGameListSocketsService,
        private readonly gameSocketService: GameSocketsService,
    ) {
        this.configureRouter();
    }

    private configureRouter() {
        this.router = Router();

        /**
         * @swagger
         *
         * /api/activeGame:
         *   post:
         *     description: Create a new active game and add the organizer as the first player
         *     tags:
         *       - Active Games
         *     produces:
         *       - application/json
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - gameId
         *               - characterForm
         *             properties:
         *               gameId:
         *                 type: string
         *               characterForm:
         *                 type: object
         *     responses:
         *       201:
         *         description: Active game created successfully
         *       400:
         *         description: Missing required fields in request body
         *       404:
         *         description: Base game not found
         *       500:
         *         description: Internal server error
         */
        this.router.post('/', async (req: Request, res: Response) => {
            try {
                const { gameId, characterForm } = req.body;
                if (!gameId || !characterForm) {
                    return res.status(StatusCodes.BAD_REQUEST).json({
                        errorCodes: [ErrorCode.MissingGameIdAndCharacterForm],
                    });
                }
                const newActiveGame = await this.activeGameService.createActiveGame(gameId, characterForm);
                if (!newActiveGame) {
                    return res.status(StatusCodes.NOT_FOUND).json({ errorCodes: [ErrorCode.ActiveGameNotFound] });
                }

                this.activeGameListSocketsService.emitJoinableGamesUpdated(newActiveGame._id);
                const payload: IActiveGameWithPlayer = { activeGame: newActiveGame, player: newActiveGame.players[0] };
                return res.status(StatusCodes.CREATED).json(payload);
            } catch (error) {
                if (error instanceof AppError) {
                    return res.status(error.status).json(toErrorResponse(error));
                }
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ errorCodes: [ErrorCode.InternalServerError] });
            }
        });

        /**
         * @swagger
         *
         * /api/activeGame/join:
         *   patch:
         *     description: Join an existing active game with a new player
         *     tags:
         *       - Active Games
         *     produces:
         *       - application/json
         *     requestBody:
         *       required: true
         *       content:
         *         application/json:
         *           schema:
         *             type: object
         *             required:
         *               - activeGameId
         *               - characterForm
         *             properties:
         *               activeGameId:
         *                 type: string
         *               characterForm:
         *                 type: object
         *     responses:
         *       200:
         *         description: Player joined active game successfully
         *       400:
         *         description: Missing required fields in request body
         *       404:
         *         description: Active game not found
         *       500:
         *         description: Internal server error
         */
        this.router.patch('/join', async (req: Request, res: Response) => {
            try {
                const { activeGameId, characterForm } = req.body;
                if (!activeGameId || !characterForm) {
                    return res.status(StatusCodes.BAD_REQUEST).json({
                        errorCodes: [ErrorCode.MissingActiveGameIdAndCharacterForm],
                    });
                }
                const updatedActiveGame = await this.activeGameService.addPlayerToActiveGame(activeGameId, characterForm);
                if (!updatedActiveGame) {
                    return res.status(StatusCodes.NOT_FOUND).json({ errorCodes: [ErrorCode.ActiveGameNotFound] });
                }
                // Emit a socket to clients when a player joins the active game.
                const joinedPlayer = updatedActiveGame.players.find((player) => player.avatar === characterForm.avatar);
                if (!joinedPlayer) {
                    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ errorCodes: [ErrorCode.AddedPlayerNotFound] });
                }
                this.activeGameListSocketsService.emitJoinableGamesUpdated(updatedActiveGame._id);
                if (characterForm.virtualPlayerProfile) {
                    this.gameSocketService.emitVirtualPlayerJoined(updatedActiveGame);
                }
                const payload: IActiveGameWithPlayer = { activeGame: updatedActiveGame, player: joinedPlayer };
                return res.status(StatusCodes.OK).json(payload);
            } catch (error) {
                if (error instanceof AppError) {
                    return res.status(error.status).json(toErrorResponse(error));
                }

                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ errorCodes: [ErrorCode.InternalServerError] });
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
                res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ errorCodes: [ErrorCode.InternalServerError] });
            }
        });

        /**
         * @swagger
         *
         * /api/activeGame/{id}:
         *   get:
         *     description: Retrieve an active game by id
         *     tags:
         *       - Active Games
         *     produces:
         *       - application/json
         *     parameters:
         *       - in: path
         *         name: id
         *         required: true
         *         schema:
         *           type: string
         *         description: Active game identifier
         *     responses:
         *       200:
         *         description: Active game retrieved successfully
         *       404:
         *         description: Active game not found
         *       500:
         *         description: Internal server error
         */
        this.router.get('/:id', async (req: Request, res: Response) => {
            try {
                const activeGameId = req.params.id as string;
                const activeGame = await this.activeGameService.getActiveGameById(activeGameId);
                if (!activeGame) {
                    return res.status(StatusCodes.NOT_FOUND).json({ errorCodes: [ErrorCode.ActiveGameNotFound] });
                }
                return res.status(StatusCodes.OK).json(activeGame);
            } catch (error) {
                if (error instanceof AppError) {
                    return res.status(error.status).json(toErrorResponse(error));
                }
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ errorCodes: [ErrorCode.InternalServerError] });
            }
        });
    }
}
