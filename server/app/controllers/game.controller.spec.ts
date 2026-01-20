import { Application } from '@app/app';
import { GameType, Visibility } from '@app/constants';
import { IBoard } from '@app/schemas/board';
import { IGame } from '@app/schemas/game';
import { GameService } from '@app/services/game.service';
import { expect } from 'chai';
import { StatusCodes } from 'http-status-codes';
import { createStubInstance, SinonStubbedInstance } from 'sinon';
import * as supertest from 'supertest';
import { Container } from 'typedi';


describe('GameController', () => {
    const baseGame: IGame = {
        gameTitle: 'Test Game',
        description: 'Test Description',
        gameMode: GameType.Classic,
        board: {} as IBoard,
        preview: 'image.png',
        visibility: Visibility.Hidden,
        lastModifiedDate: new Date(),
        dateCreated: new Date()

    };
    let gameService: SinonStubbedInstance<GameService>;
    let expressApp: Express.Application;

    beforeEach(async () => {
        gameService = createStubInstance(GameService);
        gameService.createGame.resolves(baseGame);
        const app = Container.get(Application);
        Object.defineProperty(app['gameController'], 'gameService', { value: gameService });
        expressApp = app.app;
    });

    it('should return created game on valid request', async () => {
        return supertest(expressApp)
            .post('/api/games/')
            .send({ game: baseGame })
            .expect(StatusCodes.CREATED)
            .then((response) => {
                expect(response.body).to.deep.equal(baseGame);
            });
    });

    it('should return an error when the game cannot be created', async () => {

        gameService.createGame.rejects(new Error("TEST"));
        return supertest(expressApp)
            .post('/api/games/')
            .send({ game: baseGame })
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                expect(response.body).to.equal({ error: "TEST" });
            });
    });
});
