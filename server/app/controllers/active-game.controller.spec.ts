/**
 * Testing strategy — ActiveGameController
 *
 * Approach: HTTP integration tests with supertest + Sinon stubs.
 * The controller is tested through the application's real Express HTTP interface,
 * allowing validation of the full chain (routing, middleware, error handling).
 * Dependencies (ActiveGameService, GameSocketsService, ActiveGameListSocketsService) are replaced by stubs
 * injected via the TypeDI container to isolate the controller.
 *
 * Edge cases covered:
 * - Invalid POST/PATCH payloads (missing body fields): verifies 400 responses before service use.
 * - Missing referenced games/active games during create and join operations: verifies 404 responses.
 * - Unexpected service errors with/without message: verifies stable 500 responses.
 * - Join response assembly failures (joined player not found in updated game): verifies defensive 500 handling.
 * - Fetch route failures for joinable list and active-game-by-id endpoints: verifies error mapping.
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

        turnStartTimeStamp: 0,
        currentAttack: null,
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

    // Edge case: POST /api/activeGame receives an empty payload and should fail with 400.
    it('post route should return BAD REQUEST if empty body', async () => {
        return supertest(expressApp)
            .post('/api/activeGame/')
            .send({})
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                expect(response.body.message).not.to.equal(undefined);
            });
    });

    // Edge case: createActiveGame() reports GAME_NOT_FOUND, which should map to HTTP 404.
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

    // Edge case: an unexpected service error during POST should map to HTTP 500.
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
        activeGameListSocketsService.emitJoinableGamesUpdated.returnsThis();

        return supertest(expressApp)
            .post('/api/activeGame/')
            .send({ gameId: 'some-id', characterForm: {} as CharacterFormData })
            .expect(StatusCodes.CREATED)
            .then((response) => {
                expect(response.body.activeGame._id).to.equal(createdActiveGame._id);
                expect(response.body.player).to.deep.equal(createdActiveGame.players[0]);
                expect(activeGameListSocketsService.emitJoinableGamesUpdated.calledWith(createdActiveGame._id)).to.be.equal(true);
            });
    });

    // Edge case: PATCH /join receives an empty body and should return 400.
    it('join route should return BAD REQUEST if empty body', async () => {
        return supertest(expressApp)
            .patch('/api/activeGame/join')
            .send({})
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                expect(response.body.message).not.to.equal(undefined);
            });
    });

    // Edge case: addPlayerToActiveGame() reports ACTIVE_GAME_NOT_FOUND, so route returns 404.
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

    // Edge case: service returns null for join, meaning the target active game no longer exists.
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

    // Edge case: unexpected join error should propagate as HTTP 500.
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

    // Edge case: unexpected join error without message should still return a stable 500 response.
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

    // Edge case: service returns an updated game but the joined player is missing from players[].
    // The controller should fail safely with HTTP 500.
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
                expect(activeGameListSocketsService.emitJoinableGamesUpdated.calledWith(updatedActiveGame._id)).to.be.equal(true);
            });
    });

    // Edge case: joinable list retrieval fails in the service and should map to HTTP 500.
    it('get joinable route should return 500 if the db call fails', async () => {
        activeGameService.fetchJoinableActiveGames.rejects(new Error('DB_ERROR'));

        return supertest(expressApp)
            .get('/api/activeGame/joinable')
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                expect(response.body.error).not.to.equal(undefined);
            });
    });

    // Nominal case: joinable route returns the service list with HTTP 200.
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

    // Edge case: requested active game id is unknown and should return HTTP 404.
    it('get active game by id route should return 404 if active game does not exist', async () => {
        activeGameService.getActiveGameById.resolves(null);

        return supertest(expressApp)
            .get('/api/activeGame/some-id')
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body.message).not.to.equal(undefined);
            });
    });

    // Edge case: getActiveGameById throws and the controller should return HTTP 500.
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
