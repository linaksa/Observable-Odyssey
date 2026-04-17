/**
 * Testing strategy — GameController
 *
 * Approach:
 * - Call `/api/games` endpoints through the real Express app with supertest.
 * - Stub GameService/AdminSocketsService through TypeDI to isolate controller logic.
 * - Assert status codes, payload content, and edge behavior for list/get/create/delete/visibility/update routes.
 *
 * Edge cases covered:
 * - Missing resources map to 404 for GET/DELETE/PATCH.
 * - Validation errors map to 400 for create/update/visibility changes.
 * - AppError branches are exercised for GET/DELETE/PUT routes.
 * - Unexpected service failures map to 500 with stable error payloads.
 * - Update flow distinguishes updated resources (200) from recreated resources (201).
 * - `getParamAsString` handles array and invalid parameter value types.
 */
import { Application } from '@app/app';
import { GameController } from '@app/controllers/game.controller';
import { AppError } from '@app/error-types/app-error';
import { ValidationError } from '@app/error-types/validation-error';
import { AdminSocketsService } from '@app/services/admin/admin-sockets.service';
import { GameService } from '@app/services/game/game.service';
import { IBoard } from '@common/board';
import { ErrorCode } from '@common/error-codes';
import { GameType, IGame, Visibility } from '@common/game';
import { expect } from 'chai';
import { Request } from 'express';
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
                // Normalize dates to avoid format mismatches between serialized and in-memory dates.
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
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.InternalServerError] });
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

    it('should return 404 if game not found on GET by id', async () => {
        gameService.getGame.resolves(null);

        return supertest(expressApp)
            .get(`/api/games/${fakeGameId}`)
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.GameNotFound] });
            });
    });

    it('should return 500 if getGame throws an error', async () => {
        gameService.getGame.rejects(new Error('Erreur interne du serveur'));

        return supertest(expressApp)
            .get(`/api/games/${fakeGameId}`)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.InternalServerError] });
            });
    });

    it('should return 404 if getGame throws an AppError', async () => {
        gameService.getGame.rejects(new AppError([ErrorCode.GameNotFound], StatusCodes.NOT_FOUND));

        return supertest(expressApp)
            .get(`/api/games/${fakeGameId}`)
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.GameNotFound] });
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

    it('should return an error when the game cannot be created', async () => {
        gameService.createGame.rejects(new ValidationError(ErrorCode.GameTitleMissing));
        return supertest(expressApp)
            .post('/api/games/')
            .send({ game: baseGame })
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.GameTitleMissing] });
            });
    });

    it('should return 500 on internal server error when creating a game', async () => {
        gameService.createGame.rejects(new Error('Erreur interne du serveur'));
        return supertest(expressApp)
            .post('/api/games')
            .send({ game: baseGame })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((res) => {
                expect(res.body).to.deep.equal({ errorCodes: [ErrorCode.InternalServerError] });
            });
    });

    it('should delete a game and return 204', async () => {
        gameService.deleteGame.resolves();
        return supertest(expressApp).delete(`/api/games/${fakeGameId}`).expect(StatusCodes.NO_CONTENT);
    });

    it('should return 404 if game not found on DELETE', async () => {
        gameService.deleteGame.rejects(new AppError([ErrorCode.GameAlreadyDeleted], StatusCodes.NOT_FOUND));
        return supertest(expressApp)
            .delete(`/api/games/${fakeGameId}`)
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.GameAlreadyDeleted] });
            });
    });

    it('should return 400 if deleteGame throws a validation error', async () => {
        gameService.deleteGame.rejects(new ValidationError(ErrorCode.GameTitleMissing));

        return supertest(expressApp)
            .delete(`/api/games/${fakeGameId}`)
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.GameTitleMissing] });
            });
    });

    it('should return 500 on internal server error when deleting a game', async () => {
        gameService.deleteGame.rejects(new Error('Erreur interne du serveur'));
        return supertest(expressApp)
            .delete(`/api/games/${fakeGameId}`)
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((res) => {
                expect(res.body).to.deep.equal({ errorCodes: [ErrorCode.InternalServerError] });
            });
    });

    it('should return 404 if updateGame throws an AppError', async () => {
        gameService.updateGame.rejects(new AppError([ErrorCode.GameNotFound], StatusCodes.NOT_FOUND));

        return supertest(expressApp)
            .put(`/api/games/${fakeGameId}`)
            .send({ game: baseGame })
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.GameNotFound] });
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
        gameService.changeVisibility.rejects(new AppError([ErrorCode.GameNotFound], StatusCodes.NOT_FOUND));
        return supertest(expressApp)
            .patch(`/api/games/${fakeGameId}/visibility`)
            .send({ visibility: Visibility.Viewable })
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.GameNotFound] });
            });
    });

    it('should return 400 if invalid visibility on PATCH', async () => {
        gameService.changeVisibility.rejects(new ValidationError(ErrorCode.GameVisibilityInvalid));
        return supertest(expressApp)
            .patch(`/api/games/${fakeGameId}/visibility`)
            .send({ visibility: 'eqifbgqrgiqo' })
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.GameVisibilityInvalid] });
            });
    });
    it('should return 500 on internal server error when changing visibility', async () => {
        gameService.changeVisibility.rejects(new Error('Erreur interne du serveur'));
        return supertest(expressApp)
            .patch(`/api/games/${fakeGameId}/visibility`)
            .send({ visibility: Visibility.Viewable })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((res) => {
                expect(res.body).to.deep.equal({ errorCodes: [ErrorCode.InternalServerError] });
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
        gameService.updateGame.rejects(new ValidationError(ErrorCode.GameTitleMissing));
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
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.GameTitleMissing] });
            });
    });
    it('should return 500 on internal server error when updating a game', async () => {
        gameService.updateGame.rejects(new Error('Erreur interne du serveur'));
        return supertest(expressApp)
            .put(`/api/games/${fakeGameId}`)
            .send({ game: baseGame })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((res) => {
                expect(res.body).to.deep.equal({ errorCodes: [ErrorCode.InternalServerError] });
            });
    });

    it('should return first element when param is an array', () => {
        const controller = new GameController({} as GameService, {} as AdminSocketsService);

        const fakeReq = {
            params: {
                id: ['array-id'],
            },
        } as unknown as Request;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (controller as any).getParamAsString(fakeReq, 'id');

        expect(result).to.equal('array-id');
    });

    it('should return null when param is invalid', () => {
        const controller = new GameController({} as GameService, {} as AdminSocketsService);

        const fakeReq = {
            params: {
                id: false,
            },
        } as unknown as Request;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = (controller as any).getParamAsString(fakeReq, 'id');

        expect(result).to.equal(null);
    });
});
