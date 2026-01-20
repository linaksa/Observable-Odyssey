import { Application } from '@app/app';
import { GameService } from '@app/services/game.service';
import { IBoard } from '@common/board';
import { GameType, IGame, Visibility } from '@common/game';
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
        dateCreated: new Date(),

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
});
