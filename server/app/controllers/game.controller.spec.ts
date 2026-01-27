import { Application } from '@app/app';
import { AdminSocketsService } from '@app/services/admin.sockets.service';
import { GameService } from '@app/services/game.service';
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
        preview: 'image.png',
        visibility: Visibility.Hidden,
        lastModifiedDate: new Date(),
        dateCreated: new Date(),
    };
    const baseGame2: IGame = {
        gameTitle: 'Test Game2',
        description: 'Test Description2',
        gameMode: GameType.Classic,
        board: {} as IBoard,
        preview: 'image.png',
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

    it('should return 404 if game not found on GET by id', async () => {
        gameService.getGame.resolves(null);

        return supertest(expressApp)
            .get(`/api/games/${fakeGameId}`)
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ message: 'Jeu introuvable' });
            });
    });

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

    it('should return an error when the game cannot be created', async () => {
        gameService.createGame.rejects(new Error('TEST'));
        return supertest(expressApp)
            .post('/api/games/')
            .send({ game: baseGame })
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                expect(response.body).to.deep.equal({ error: 'TEST' });
            });
    });

    it('should delete a game and return 204', async () => {
        gameService.deleteGame.resolves();

        return supertest(expressApp).delete(`/api/games/${fakeGameId}`).expect(StatusCodes.NO_CONTENT);
    });

    it('should return 404 if game not found on DELETE', async () => {
        gameService.deleteGame.rejects(new Error('Jeu introuvable'));

        return supertest(expressApp)
            .delete(`/api/games/${fakeGameId}`)
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ error: 'Jeu introuvable' });
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

    it('should return 400 if invalid visibility on PATCH', async () => {
        gameService.changeVisibility.rejects(new Error('Valeur invalide'));

        return supertest(expressApp)
            .patch(`/api/games/${fakeGameId}/visibility`)
            .send({ visibility: 'eqifbgqrgiqo' })
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                expect(response.body).to.deep.equal({ error: 'Valeur invalide' });
            });
    });

    it('should update a game and return updated game', async () => {
        const updatedGame = { ...baseGame, gameTitle: 'Updated Title' };
        gameService.updateGame.resolves(updatedGame);

        return supertest(expressApp)
            .put(`/api/games/${fakeGameId}`)
            .send({ game: updatedGame })
            .expect(StatusCodes.OK)
            .then((response) => {
                expect(response.body.gameTitle).to.deep.equal('Updated Title');
            });
    });

    it('should return 404 if game not found on PUT', async () => {
        gameService.updateGame.rejects(new Error('Jeu introuvable'));

        return supertest(expressApp)
            .put(`/api/games/${fakeGameId}`)
            .send({ game: baseGame })
            .expect(StatusCodes.NOT_FOUND)
            .then((response: Response) => {
                expect(response.body).to.deep.equal({ error: 'Jeu introuvable' });
            });
    });

    it('should return 400 on PUT if body is invalid', async () => {
        gameService.updateGame.rejects(new Error('Données invalides'));

        return supertest(expressApp)
            .put(`/api/games/${fakeGameId}`)
            .send({}) // body invalide ou manquant
            .expect(StatusCodes.BAD_REQUEST)
            .then((response: Response) => {
                expect(response.body).to.deep.equal({ error: 'Données invalides' });
            });
    });
});
