/**
 * Testing strategy — GameController
 *
 * Approach: HTTP integration tests with supertest + Sinon stubs.
 * The controller is tested through the application's real Express HTTP interface,
 * allowing validation of the full chain (routing, middleware, error handling).
 * Dependencies (GameService, AdminSocketsService) are replaced by stubs
 * injected via the TypeDI container to isolate the controller.
 *
 * Edge cases covered:
 * - Resource not found (404): verifies the controller returns the correct response
 *   when the service layer cannot find the requested entity.
 * - Unexpected internal error (500): verifies that any unexpected exception is properly
 *   caught and returned with the appropriate HTTP code.
 * - Invalid request data (400 / ValidationError): verifies rejection of malformed
 *   or incomplete payloads before any persistence.
 * - Updating a game deleted during the request: verifies the controller handles
 *   the service's automatic recreation case (201 vs 200).
 * - Invalid visibility on PATCH: verifies out-of-enum values are rejected.
 */
import { Application } from '@app/app';
import { ValidationError } from '@app/error-types/validation-error';
import { AdminSocketsService } from '@app/services/admin/admin-sockets.service';
import { GameService } from '@app/services/game/game.service';
import { IBoard } from '@common/board';
import { GameType, IGame, Visibility } from '@common/game';
import { expect } from 'chai';
import { StatusCodes } from 'http-status-codes';
import { createStubInstance, SinonStubbedInstance } from 'sinon';
import supertest, { Response } from 'supertest';
import { Container } from 'typedi';

const normalizeDates = (games: IGame[]) =>
    games.map((g) => ({
        ...g,
        dateCreated: new Date(g.dateCreated).toISOString(),
        lastModifiedDate: new Date(g.lastModifiedDate).toISOString(),
    }));

describe('GameController', () => {
    const baseGame: IGame = {
        gameTitle: 'Test Game',
        description: 'Test Description',
        gameMode: GameType.Classic,
        board: {} as IBoard,
        visibility: Visibility.Hidden,
        lastModifiedDate: new Date(),
        dateCreated: new Date(),
    };
    const baseGame2: IGame = {
        gameTitle: 'Test Game2',
        description: 'Test Description2',
        gameMode: GameType.Classic,
        board: {} as IBoard,
        visibility: Visibility.Hidden,
        lastModifiedDate: new Date(),
        dateCreated: new Date(),
    };
    const fakeGameId = '507f1f77bcf86cd799439011';
    const fakeGameId2 = '507f1f77bcf86cd799439012';
    const existingGame1 = {
        _id: fakeGameId,
        ...baseGame,
    };
    const existingGame2 = {
        _id: fakeGameId2,
        ...baseGame2,
    };
    let gameService: SinonStubbedInstance<GameService>;
    let adminSocketService: SinonStubbedInstance<AdminSocketsService>;
    let expressApp: Express.Application;

    beforeEach(async () => {
        Container.reset();
        gameService = createStubInstance(GameService);
        adminSocketService = createStubInstance(AdminSocketsService);
        gameService.createGame.resolves(baseGame);
        Container.set(GameService, gameService);
        Container.set(AdminSocketsService, adminSocketService);
        const app = Container.get(Application);
        expressApp = app.app;
    });

    it('should return all games', async () => {
        const gamesList = [existingGame1, existingGame2];
        gameService.getAllGames.resolves(gamesList);
        return supertest(expressApp)
            .get('/api/games/')
            .expect(StatusCodes.OK)
            .then((response) => {
                // Normalize dates to avoid comparison issues related to date formats
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                expect(normalizeDates(response.body)).to.deep.equal(normalizeDates(gamesList as any));
            });
    });

    it('should return 500 if getAllGames fails', async () => {
        gameService.getAllGames.rejects(new Error('Erreur interne du serveur'));

        return supertest(expressApp)
            .get('/api/games/')
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                expect(response.body).to.deep.equal({ error: 'Erreur interne du serveur' });
            });
    });

    it('should return a game by id', async () => {
        gameService.getGame.resolves(existingGame1);

        return supertest(expressApp)
            .get(`/api/games/${fakeGameId}`)
            .expect(StatusCodes.OK)
            .then((response) => {
                expect(response.body.gameTitle).to.equal(existingGame1.gameTitle);
                expect(response.body.description).to.equal(existingGame1.description);
            });
    });

    // Edge case: the identifier is a valid MongoDB format but no document
    // matches in the database — the controller should respond 404 without throwing an exception.
    it('should return 404 if game not found on GET by id', async () => {
        gameService.getGame.resolves(null);

        return supertest(expressApp)
            .get(`/api/games/${fakeGameId}`)
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ message: 'Jeu introuvable' });
            });
    });

    // Edge case: an unexpected error is propagated from the service — the controller
    // should catch it and return a 500 with the serialized error message in JSON.
    it('should return 500 if getGame throws an error', async () => {
        gameService.getGame.rejects(new Error('Erreur interne du serveur'));

        return supertest(expressApp)
            .get(`/api/games/${fakeGameId}`)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                expect(response.body).to.deep.equal({ message: 'Erreur interne du serveur' });
            });
    });

    it('should return created game on valid request', async () => {
        return supertest(expressApp)
            .post('/api/games/')
            .send({ game: baseGame })
            .expect(StatusCodes.CREATED)
            .then((response) => {
                expect(response.body.gameTitle).to.equal(baseGame.gameTitle);
                expect(response.body.description).to.equal(baseGame.description);
                expect(new Date(response.body.dateCreated)).to.be.instanceOf(Date);
                expect(new Date(response.body.lastModifiedDate)).to.be.instanceOf(Date);
            });
    });

    // Edge case: the service rejects creation with a ValidationError (business data
    // invalid). The controller should return 400 rather than 500.
    it('should return an error when the game cannot be created', async () => {
        gameService.createGame.rejects(new ValidationError('TEST'));
        return supertest(expressApp)
            .post('/api/games/')
            .send({ game: baseGame })
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                expect(response.body).to.deep.equal({ error: 'TEST' });
            });
    });

    it('should return 500 on internal server error when creating a game', async () => {
        gameService.createGame.rejects(new Error('Erreur interne du serveur'));
        return supertest(expressApp)
            .post('/api/games')
            .send({ game: baseGame })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((res) => {
                expect(res.body).to.deep.equal({ error: 'Erreur interne du serveur' });
            });
    });

    it('should delete a game and return 204', async () => {
        gameService.deleteGame.resolves();
        return supertest(expressApp).delete(`/api/games/${fakeGameId}`).expect(StatusCodes.NO_CONTENT);
    });

    // Edge case: attempting to delete a game that is already deleted — the service throws
    // an error and the controller should return 404.
    it('should return 404 if game not found on DELETE', async () => {
        gameService.deleteGame.rejects(new Error('Jeu déjà supprimé'));
        return supertest(expressApp)
            .delete(`/api/games/${fakeGameId}`)
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ error: 'Jeu déjà supprimé' });
            });
    });
    it('should return 500 on internal server error when deleting a game', async () => {
        gameService.deleteGame.rejects(new Error('Erreur interne du serveur'));
        return supertest(expressApp)
            .delete(`/api/games/${fakeGameId}`)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((res) => {
                expect(res.body).to.deep.equal({ error: 'Erreur interne du serveur' });
            });
    });

    it('should change visibility and return updated game', async () => {
        const updatedGame = { ...baseGame, visibility: Visibility.Viewable };
        gameService.changeVisibility.resolves(updatedGame);

        return supertest(expressApp)
            .patch(`/api/games/${fakeGameId}/visibility`)
            .send({ visibility: Visibility.Viewable })
            .expect(StatusCodes.OK)
            .then((response) => {
                expect(response.body.visibility).to.deep.equal(Visibility.Viewable);
            });
    });

    it('should return 404 if game not found on PATCH', async () => {
        gameService.changeVisibility.rejects(new Error('Jeu introuvable'));
        return supertest(expressApp)
            .patch(`/api/games/${fakeGameId}/visibility`)
            .send({ visibility: Visibility.Viewable })
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ error: 'Jeu introuvable' });
            });
    });

    // Edge case: the visibility value sent does not belong to the enumeration — the
    // service throws a ValidationError and the controller should return 400.
    it('should return 400 if invalid visibility on PATCH', async () => {
        gameService.changeVisibility.rejects(new ValidationError('Visibilité invalide'));
        return supertest(expressApp)
            .patch(`/api/games/${fakeGameId}/visibility`)
            .send({ visibility: 'eqifbgqrgiqo' })
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                expect(response.body).to.deep.equal({ error: 'Visibilité invalide' });
            });
    });
    it('should return 500 on internal server error when changing visibility', async () => {
        gameService.changeVisibility.rejects(new Error('Erreur interne du serveur'));
        return supertest(expressApp)
            .patch(`/api/games/${fakeGameId}/visibility`)
            .send({ visibility: Visibility.Viewable })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((res) => {
                expect(res.body).to.deep.equal({ error: 'Erreur interne du serveur' });
            });
    });

    it('should update a game and return updated game', async () => {
        const updatedGame = { ...baseGame, gameTitle: 'Updated Title' };
        gameService.updateGame.resolves({ game: updatedGame, created: false });

        return supertest(expressApp)
            .put(`/api/games/${fakeGameId}`)
            .send({ game: updatedGame })
            .expect(StatusCodes.OK)
            .then((response) => {
                expect(response.body.gameTitle).to.deep.equal('Updated Title');
            });
    });

    // Edge case: the game targeted by the update was deleted between read and
    // write (race condition). The service signals recreation and the controller should
    // return 201 instead of 200.
    it('should create a new game if the game to update has been deleted during update', async () => {
        const createdGame = { ...baseGame, gameTitle: 'Created Title' };
        gameService.updateGame.resolves({ game: createdGame, created: true });
        return supertest(expressApp)
            .put(`/api/games/${fakeGameId}`)
            .send({ game: createdGame })
            .expect(StatusCodes.CREATED)
            .then((response) => {
                expect(response.body.gameTitle).to.deep.equal('Created Title');
            });
    });

    it('should return 400 on PUT if body is invalid', async () => {
        gameService.updateGame.rejects(new ValidationError('Données invalides'));
        const invalidBody = {
            game: {
                gameTitle: '',
                description: '',
                gameMode: 'Invalid',
            },
        };
        return supertest(expressApp)
            .put(`/api/games/${fakeGameId}`)
            .send(invalidBody)
            .expect(StatusCodes.BAD_REQUEST)
            .then((response: Response) => {
                expect(response.body).to.deep.equal({ error: 'Données invalides' });
            });
    });
    it('should return 500 on internal server error when updating a game', async () => {
        gameService.updateGame.rejects(new Error('Erreur interne du serveur'));
        return supertest(expressApp)
            .put(`/api/games/${fakeGameId}`)
            .send({ game: baseGame })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((res) => {
                expect(res.body).to.deep.equal({ error: 'Erreur interne du serveur' });
            });
    });
});
