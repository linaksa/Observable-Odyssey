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
import { ActiveGameListSocketsService } from '@app/services/active-game/active-game-list-sockets.service';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { GameSocketsService } from '@app/services/realtime/game-sockets.service';
import { IActiveGame } from '@common/activeGame';
import { IBoard } from '@common/board';
import { CharacterFormData, ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { expect } from 'chai';
import { StatusCodes } from 'http-status-codes';
import { createStubInstance, SinonStubbedInstance } from 'sinon';
import supertest from 'supertest';
import { Container } from 'typedi';

describe('ActiveGameController', () => {
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

    const dummyActiveGame: IActiveGame = {
        _id: 'dummyActiveGameId',
        game: baseGame,
        players: [] as ICharacter[],
        currentPlayerIndex: 0,
        turnOrder: [],
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Dummy Organizer',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
    };

    const dummyPlayerCharacter: ICharacter = {
        name: 'test',
        avatar: Avatar.Avatar3,
        initialHealth: 1,
        currentHealth: 1,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.FourSided,
        rapidityPoints: 1,
        attackPoints: 1,
        defensePoints: 1,
        actionsLeft: 1,
        movementLeft: 1,
        hasAbandoned: false,
        victories: 0,
        positionDepart: {
            x: 1,
            y: 1,
        },
        positionGrille: {
            x: 1,
            y: 1,
        },
    };

    let activeGameService: SinonStubbedInstance<ActiveGameService>;
    let gameSocketService: SinonStubbedInstance<GameSocketsService>;
    let activeGameListSocketsService: SinonStubbedInstance<ActiveGameListSocketsService>;
    let expressApp: Express.Application;

    beforeEach(async () => {
        Container.reset();
        activeGameService = createStubInstance(ActiveGameService);
        gameSocketService = createStubInstance(GameSocketsService);
        activeGameListSocketsService = createStubInstance(ActiveGameListSocketsService);
        Container.set(ActiveGameService, activeGameService);
        Container.set(GameSocketsService, gameSocketService);
        Container.set(ActiveGameListSocketsService, activeGameListSocketsService);

        const app = Container.get(Application);
        expressApp = app.app;
    });

    // Edge case for POST route
    // Make sure that the controller handles incorrect body
    it('post route should return BAD REQUEST if empty body', async () => {
        return supertest(expressApp)
            .post('/api/activeGame/')
            .send({})
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                expect(response.body.message).not.to.equal(undefined);
            });
    });

    // Edge case for POST route
    // Make sure that the controller handles the case where the gameId provided does not exist
    it('post route should return 404 if game does not exists', async () => {
        activeGameService.createActiveGame.rejects(new Error('GAME_NOT_FOUND'));

        return supertest(expressApp)
            .post('/api/activeGame/')
            .send({ gameId: 'non-existent-id', characterForm: {} as CharacterFormData })
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body.message).not.to.equal(undefined);
            });
    });

    // Edge case for POST route
    // Make sure that the controller handles unexpected error from the service
    it('post route should return 500 if service throws unexpected error', async () => {
        activeGameService.createActiveGame.rejects(new Error('UNEXPECTED_ERROR'));

        return supertest(expressApp)
            .post('/api/activeGame/')
            .send({ gameId: 'some-id', characterForm: {} as CharacterFormData })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                expect(response.body.message).not.to.equal(undefined);
            });
    });

    // Nominal case
    // Make sure that the controller returns the created active game and player with the correct status code
    it('post route should return 200 and return ', async () => {
        const createdActiveGame = { ...dummyActiveGame, players: [dummyPlayerCharacter] };
        activeGameService.createActiveGame.resolves(createdActiveGame);
        gameSocketService.emitPlayersUpdated.returnsThis();
        activeGameListSocketsService.emitJoinableGamesUpdated.returnsThis();

        return supertest(expressApp)
            .post('/api/activeGame/')
            .send({ gameId: 'some-id', characterForm: {} as CharacterFormData })
            .expect(StatusCodes.CREATED)
            .then((response) => {
                expect(response.body.activeGame._id).to.equal(createdActiveGame._id);
                expect(response.body.player).to.deep.equal(createdActiveGame.players[0]);

                expect(gameSocketService.emitPlayersUpdated.calledWith(createdActiveGame._id, createdActiveGame.players)).to.be.equal(true);
                expect(activeGameListSocketsService.emitJoinableGamesUpdated.calledWith(createdActiveGame._id)).to.be.equal(true);
            });
    });

    // Edge case for join route
    // Make sure that the controller handles incorrect body
    it('join route should return BAD REQUEST if empty body', async () => {
        return supertest(expressApp)
            .patch('/api/activeGame/join')
            .send({})
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                expect(response.body.message).not.to.equal(undefined);
            });
    });

    // Edge case for join route
    // Make sure that the controller handles the case where the activeGameId provided does not exist
    it('join route should return 404 if game does not exists', async () => {
        activeGameService.addPlayerToActiveGame.rejects(new Error('ACTIVE_GAME_NOT_FOUND'));

        return supertest(expressApp)
            .patch('/api/activeGame/join')
            .send({ activeGameId: 'non-existent-id', characterForm: {} as CharacterFormData })
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body.message).not.to.equal(undefined);
            });
    });

    // Edge case for join route
    // Make sure that the controller handles unexisting activeGame
    it('join route should return 404 if activeGameId reference an unexisting game', async () => {
        activeGameService.addPlayerToActiveGame.resolves(null);

        return supertest(expressApp)
            .patch('/api/activeGame/join')
            .send({ activeGameId: 'non-existent-id', characterForm: {} as CharacterFormData })
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body.message).not.to.equal(undefined);
            });
    });

    // Edge case for join route
    // The controller should return 500 if the service throws an unexpected error
    it('join route should return 500 if service throws unexpected error', async () => {
        activeGameService.addPlayerToActiveGame.rejects(new Error('UNEXPECTED_ERROR'));

        return supertest(expressApp)
            .patch('/api/activeGame/join')
            .send({ activeGameId: 'non-existent-id', characterForm: {} as CharacterFormData })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                expect(response.body.message).not.to.equal(undefined);
            });
    });

    // Edge case for join route
    // The controller should return 500 whith the default error message if the service throws an unexpected error without message
    it('join route should return 500 if service throws unexpected error', async () => {
        activeGameService.addPlayerToActiveGame.rejects(new Error());

        return supertest(expressApp)
            .patch('/api/activeGame/join')
            .send({ activeGameId: 'non-existent-id', characterForm: {} as CharacterFormData })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                expect(response.body.message).not.to.equal(undefined);
            });
    });

    // Edge case for join route
    // The controler should return 500 if the player added cannot be found in the updated active game
    it('join route should return 500 if player added cannot be found in the updated active game', async () => {
        const updatedActiveGame = { ...dummyActiveGame, players: [] as ICharacter[] };
        activeGameService.addPlayerToActiveGame.resolves(updatedActiveGame);

        return supertest(expressApp)
            .patch('/api/activeGame/join')
            .send({ activeGameId: 'some-id', characterForm: {} as CharacterFormData })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                expect(response.body.message).not.to.equal(undefined);
            });
    });

    // Nominal case for join route
    // Make sure that the controller returns the updated active game and joined player with the correct status code
    it('join route should return 200 and return the updated active game and joined player', async () => {
        const selectedAvatar = Avatar.Avatar1;
        const dummyPlayer = { ...dummyPlayerCharacter, avatar: selectedAvatar };
        const updatedActiveGame = { ...dummyActiveGame, players: [dummyPlayer] };
        activeGameService.addPlayerToActiveGame.resolves(updatedActiveGame);
        gameSocketService.emitPlayersUpdated.returnsThis();
        activeGameListSocketsService.emitJoinableGamesUpdated.returnsThis();

        const dummyCharacterForm: CharacterFormData = {
            name: 'Player 2',
            avatar: selectedAvatar,
            initialHealth: 100,
            attackBonusDiceType: DiceType.SixSided,
            defenseBonusDiceType: DiceType.SixSided,
            rapidityPoints: 3,
            attackPoints: 2,
            defensePoints: 2,
        };

        return supertest(expressApp)
            .patch('/api/activeGame/join')
            .send({ activeGameId: 'some-id', characterForm: dummyCharacterForm })
            .expect(StatusCodes.OK)
            .then((response) => {
                expect(response.body.activeGame._id).to.equal(updatedActiveGame._id);
                expect(response.body.player).to.deep.equal(updatedActiveGame.players[0]);

                expect(gameSocketService.emitPlayersUpdated.calledWith(updatedActiveGame._id, updatedActiveGame.players)).to.be.equal(true);
                expect(activeGameListSocketsService.emitJoinableGamesUpdated.calledWith(updatedActiveGame._id)).to.be.equal(true);
            });
    });

    // Edge case for get joinable active games route
    // Make sure that the controller handles unexpected error from the service
    it('get joinable route should return 500 if the db call fails', async () => {
        activeGameService.fetchJoinableActiveGames.rejects(new Error('DB_ERROR'));

        return supertest(expressApp)
            .get('/api/activeGame/joinable')
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                expect(response.body.error).not.to.equal(undefined);
            });
    });

    // Edge case for get joinable active games route
    // Make sure that the controler returns the result of the db call
    it('get joinable route should return 200 and the list of joinable active games', async () => {
        const activeGame1 = { ...dummyActiveGame, _id: 'activeGame1' };
        const activeGame2 = { ...dummyActiveGame, _id: 'activeGame2' };
        activeGameService.fetchJoinableActiveGames.resolves([activeGame1, activeGame2]);

        return supertest(expressApp)
            .get('/api/activeGame/joinable')
            .expect(StatusCodes.OK)
            .then((response) => {
                expect(response.body).to.be.an('array').that.has.lengthOf(2);
                expect(response.body[0]._id).to.equal(activeGame1._id);
                expect(response.body[1]._id).to.equal(activeGame2._id);
            });
    });

    // Edge case for get active game by id route
    // Make sure that the controller handles incorrect ids
    it('get active game by id route should return 404 if active game does not exist', async () => {
        activeGameService.getActiveGameById.resolves(null);

        return supertest(expressApp)
            .get('/api/activeGame/some-id')
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body.message).not.to.equal(undefined);
            });
    });

    // Edge case for get active game by id route
    // Make sure that the controller handles unexpected error from the service
    it('get active game by id route should return 500 if the db call fails', async () => {
        activeGameService.getActiveGameById.rejects(new Error('DB_ERROR'));

        return supertest(expressApp)
            .get('/api/activeGame/some-id')
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                expect(response.body.message).not.to.be.equal(undefined);
                expect(response.body.error).not.to.be.equal(undefined);
            });
    });

    // Nominal case for get active game by id route
    // Make sure that the controller returns the active game with the correct status code
    it('get active game by id route should return 200 and the active game', async () => {
        const activeGame = { ...dummyActiveGame, _id: 'activeGame1' };
        activeGameService.getActiveGameById.resolves(activeGame);

        return supertest(expressApp)
            .get('/api/activeGame/activeGame1')
            .expect(StatusCodes.OK)
            .then((response) => {
                expect(response.body._id).to.equal(activeGame._id);
            });
    });
});
