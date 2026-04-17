/**
 * Testing strategy — ActiveGameController
 *
 * Approach:
 * - Exercise `/api/activeGame` routes through the real Express app with supertest.
 * - Stub ActiveGameService and socket broadcasters through TypeDI to isolate controller behavior.
 * - Validate HTTP status mapping plus response payload shape for create, join, list, and fetch-by-id flows.
 *
 * Edge cases covered:
 * - Missing request payload fields on create/join return 400.
 * - Missing game references and null service returns map to 404.
 * - AppError failures map to their status codes for create/join/fetch routes.
 * - Unexpected create/join/fetch failures map to 500 with `InternalServerError`.
 * - Join succeeds only when the joined player can be recovered from returned players.
 * - Virtual player joins emit the dedicated socket event.
 */
import { Application } from '@app/app';
import { AppError } from '@app/error-types/app-error';
import { ActiveGameListSocketsService } from '@app/services/active-game/active-game-list-sockets.service';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { GameSocketsService } from '@app/services/realtime/game-sockets.service';
import { IActiveGame } from '@common/active-game';
import { IBoard } from '@common/board';
import { CharacterFormData, ICharacter, VirtualPlayerProfile } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { ErrorCode } from '@common/error-codes';
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
        hasFlagId: '',

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
        startingPosition: {
            x: 1,
            y: 1,
        },
        currentPosition: {
            x: 1,
            y: 1,
        },

        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [] as string[],
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

    it('post route should return BAD REQUEST if empty body', async () => {
        return supertest(expressApp)
            .post('/api/activeGame/')
            .send({})
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.MissingGameIdAndCharacterForm] });
            });
    });

    it('post route should return 404 if game does not exists', async () => {
        activeGameService.createActiveGame.rejects(new AppError([ErrorCode.GameNotFound], StatusCodes.NOT_FOUND));

        return supertest(expressApp)
            .post('/api/activeGame/')
            .send({ gameId: 'non-existent-id', characterForm: {} as CharacterFormData })
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.GameNotFound] });
            });
    });

    it('post route should return 404 if service returns no active game', async () => {
        activeGameService.createActiveGame.resolves(null);

        return supertest(expressApp)
            .post('/api/activeGame/')
            .send({ gameId: 'some-id', characterForm: {} as CharacterFormData })
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.ActiveGameNotFound] });
            });
    });

    it('post route should return 500 if service throws unexpected error', async () => {
        activeGameService.createActiveGame.rejects(new Error('UNEXPECTED_ERROR'));

        return supertest(expressApp)
            .post('/api/activeGame/')
            .send({ gameId: 'some-id', characterForm: {} as CharacterFormData })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.InternalServerError] });
            });
    });

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

    it('join route should return BAD REQUEST if empty body', async () => {
        return supertest(expressApp)
            .patch('/api/activeGame/join')
            .send({})
            .expect(StatusCodes.BAD_REQUEST)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.MissingActiveGameIdAndCharacterForm] });
            });
    });

    it('join route should return 404 if game does not exists', async () => {
        activeGameService.addPlayerToActiveGame.rejects(new AppError([ErrorCode.ActiveGameNotFound], StatusCodes.NOT_FOUND));

        return supertest(expressApp)
            .patch('/api/activeGame/join')
            .send({ activeGameId: 'non-existent-id', characterForm: {} as CharacterFormData })
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.ActiveGameNotFound] });
            });
    });

    it('join route should return 404 if activeGameId reference an unexisting game', async () => {
        activeGameService.addPlayerToActiveGame.resolves(null);

        return supertest(expressApp)
            .patch('/api/activeGame/join')
            .send({ activeGameId: 'non-existent-id', characterForm: {} as CharacterFormData })
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.ActiveGameNotFound] });
            });
    });

    it('join route should return 500 if service throws unexpected error', async () => {
        activeGameService.addPlayerToActiveGame.rejects(new Error('UNEXPECTED_ERROR'));

        return supertest(expressApp)
            .patch('/api/activeGame/join')
            .send({ activeGameId: 'non-existent-id', characterForm: {} as CharacterFormData })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.InternalServerError] });
            });
    });

    it('join route should return 500 if player added cannot be found in the updated active game', async () => {
        const updatedActiveGame = { ...dummyActiveGame, players: [] as ICharacter[] };
        activeGameService.addPlayerToActiveGame.resolves(updatedActiveGame);

        return supertest(expressApp)
            .patch('/api/activeGame/join')
            .send({ activeGameId: 'some-id', characterForm: {} as CharacterFormData })
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.AddedPlayerNotFound] });
            });
    });

    it('join route should emit the virtual player joined event when needed', async () => {
        const selectedAvatar = Avatar.Avatar1;
        const virtualPlayer = { ...dummyPlayerCharacter, avatar: selectedAvatar, virtualPlayerProfile: VirtualPlayerProfile.Agressive };
        const updatedActiveGame = { ...dummyActiveGame, players: [virtualPlayer] };
        activeGameService.addPlayerToActiveGame.resolves(updatedActiveGame);
        activeGameListSocketsService.emitJoinableGamesUpdated.returnsThis();
        gameSocketService.emitVirtualPlayerJoined.returnsThis();

        const dummyCharacterForm: CharacterFormData = {
            name: 'Bot 1',
            avatar: selectedAvatar,
            initialHealth: 100,
            attackBonusDiceType: DiceType.SixSided,
            defenseBonusDiceType: DiceType.SixSided,
            rapidityPoints: 3,
            attackPoints: 2,
            defensePoints: 2,
            virtualPlayerProfile: VirtualPlayerProfile.Agressive,
        };

        return supertest(expressApp)
            .patch('/api/activeGame/join')
            .send({ activeGameId: 'some-id', characterForm: dummyCharacterForm })
            .expect(StatusCodes.OK)
            .then((response) => {
                expect(response.body.player).to.deep.equal(updatedActiveGame.players[0]);
                expect(gameSocketService.emitVirtualPlayerJoined.calledWith(updatedActiveGame)).to.be.equal(true);
            });
    });

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

    it('get active game by id route should return 404 if service returns null', async () => {
        activeGameService.getActiveGameById.resolves(null);

        return supertest(expressApp)
            .get('/api/activeGame/some-id')
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.ActiveGameNotFound] });
            });
    });

    it('get active game by id route should return service status for AppError', async () => {
        activeGameService.getActiveGameById.rejects(new AppError([ErrorCode.ActiveGameNotFound], StatusCodes.NOT_FOUND));

        return supertest(expressApp)
            .get('/api/activeGame/some-id')
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.ActiveGameNotFound] });
            });
    });

    it('get joinable route should return 500 if the db call fails', async () => {
        activeGameService.fetchJoinableActiveGames.rejects(new Error('DB_ERROR'));

        return supertest(expressApp)
            .get('/api/activeGame/joinable')
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.InternalServerError] });
            });
    });

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

    it('get active game by id route should return 404 if active game does not exist', async () => {
        activeGameService.getActiveGameById.resolves(null);

        return supertest(expressApp)
            .get('/api/activeGame/some-id')
            .expect(StatusCodes.NOT_FOUND)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.ActiveGameNotFound] });
            });
    });

    it('get active game by id route should return 500 if the db call fails', async () => {
        activeGameService.getActiveGameById.rejects(new Error('DB_ERROR'));

        return supertest(expressApp)
            .get('/api/activeGame/some-id')
            .expect(StatusCodes.INTERNAL_SERVER_ERROR)
            .then((response) => {
                expect(response.body).to.deep.equal({ errorCodes: [ErrorCode.InternalServerError] });
            });
    });

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
