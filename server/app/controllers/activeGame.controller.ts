import { ActiveGameListSocketsService } from '@app/services/active-game-list-sockets.service';
import { ActiveGameService } from '@app/services/active-game.service';
import { GameSocketsService } from '@app/services/game-sockets.service';
import { IActiveGameWithPlayer } from '@common/activeGame';
import { Request, Response, Router } from 'express';
import { StatusCodes } from 'http-status-codes';
import { Service } from 'typedi';

@Service()
export class ActiveGameController {
    router: Router;

    constructor(
        private readonly activeGameService: ActiveGameService,
        private readonly gameSocketsService: GameSocketsService,
        private readonly activeGameListSocketsService: ActiveGameListSocketsService,
    ) {
        this.configureRouter();
    }

    private getParamAsString(req: Request, key: string): string | null {
        const value = (req.params as Record<string, unknown>)[key];
        if (typeof value === 'string') return value;
        if (Array.isArray(value) && typeof value[0] === 'string') return value[0];
        return null;
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
                const createdPlayer = newActiveGame.players[0];
                if (!createdPlayer) {
                    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Impossible de créer le joueur local' });
                }
                this.gameSocketsService.emitPlayersUpdated(newActiveGame._id, newActiveGame.players);
                this.activeGameListSocketsService.emitJoinableGamesUpdated(newActiveGame);
                const payload: IActiveGameWithPlayer = { activeGame: newActiveGame, player: createdPlayer };
                return res.status(StatusCodes.CREATED).json(payload);
            } catch (error) {
                if (error.message === 'GAME_NOT_FOUND') {
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
                // emmetre un socket au client quand un joueur rejoint la partie active.
                if (updatedActiveGame) {
                    this.gameSocketsService.emitPlayersUpdated(updatedActiveGame._id, updatedActiveGame.players);

                } else {
                    return res.status(StatusCodes.NOT_FOUND).json({ message: 'Partie active introuvable' });
                }

                const joinedPlayer = updatedActiveGame.players.find((player) => player.avatar === characterForm.avatar);
                if (!joinedPlayer) {
                    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: 'Impossible de trouver le joueur ajouté' });
                }

                this.gameSocketsService.emitPlayersUpdated(updatedActiveGame._id, updatedActiveGame.players);
                this.activeGameListSocketsService.emitJoinableGamesUpdated(updatedActiveGame);
                const payload: IActiveGameWithPlayer = { activeGame: updatedActiveGame, player: joinedPlayer };
                return res.status(StatusCodes.OK).json(payload);
            } catch (error) {
                if (error.message === 'Active game not found') {
                    return res.status(StatusCodes.NOT_FOUND).json({ message: 'Partie active introuvable' });
                }

                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message || 'Erreur interne du serveur' });
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

        this.router.get('/:id', async (req: Request, res: Response) => {
            try {
                const activeGameId = this.getParamAsString(req, 'id');
                if (!activeGameId) {
                    return res.status(StatusCodes.BAD_REQUEST).json({ message: 'ID de partie active invalide' });
                }
                const activeGame = await this.activeGameService.getActiveGameById(activeGameId);
                if (!activeGame) {
                    return res.status(StatusCodes.NOT_FOUND).json({ message: 'Partie active introuvable' });
                }
                return res.status(StatusCodes.OK).json(activeGame);
            } catch (error) {
                return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
                    message: 'Erreur interne du serveur',
                    error,
                });
            }
        });
    }
}
