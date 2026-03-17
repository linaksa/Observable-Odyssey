/* eslint-disable max-lines */
/**
 * Testing strategy — GameService
 *
 * Approach: unit tests with Sinon stubs on Mongoose methods
 * (create, findById, find, findByIdAndUpdate, findByIdAndDelete, findOne).
 * No real database is used; stubs allow precise control over returned values or thrown errors for
 * each scenario. BoardService is replaced by a stub to isolate
 * board validation from the GameService business logic.
 *
 * Edge cases covered:
 * - No games in DB (empty array): getAllGames() should return [] without error.
 * - Nonexistent id: getGame() / deleteGame() / changeVisibility() /
 *   updateGame() should handle null without throwing an uncontrolled exception.
 * - Missing fields (title, description, board, preview): createGame() should
 *   reject each missing field independently with a clear message.
 * - Field containing only whitespace: title or description with only whitespace
 *   should be rejected as empty.
 * - Exceeding maximum lengths (BAD_TITLE_LENGTH / BAD_DESCRIPTION_LENGTH):
 *   exact bounds defined in constants are tested.
 * - Invalid game mode: an out-of-enum value should be rejected.
 * - Duplicate title: creation or update with an existing title should be rejected.
 * - Game deleted during update (race condition): updateGame() should
 *   create a new game and signal creation (created: true).
 * - Route parameter array or invalid type for getParamAsString:
 *   verifies the controller helper handles unexpected types.
 */

import { GameController } from '@app/controllers/game.controller';
import { game } from '@app/schemas/game';
import { CellType, IBoard } from '@common/board';
import { BAD_DESCRIPTION_LENGTH, BAD_TITLE_LENGTH } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { ItemType } from '@common/items';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { AdminSocketsService } from '@app/services/admin/admin-sockets.service';
import { BoardService } from '@app/services/board/board.service';
import { GameService } from '@app/services/game/game.service';

describe('Game Service', () => {
    let gameService: GameService;
    let mockBoardService: sinon.SinonStubbedInstance<BoardService>;
    let gameCreateStub: sinon.SinonStub;
    let findByIdStub: sinon.SinonStub;
    let findByIdAndUpdateStub: sinon.SinonStub;
    let findByIdAndDeleteStub: sinon.SinonStub;
    let findStub: sinon.SinonStub;

    const fakeGameId = '507f1f77bcf86cd799439011';
    const anotherFakeGameId = '507f1f77bcf86cd799439012';
    const baseGame: IGame = {
        gameTitle: 'Test Game',
        description: 'Test Description',
        gameMode: GameType.Classic,
        board: { cells: [[CellType.Empty]], items: [] },
        preview: 'image.png',
        visibility: Visibility.Hidden,
        lastModifiedDate: new Date(),
        dateCreated: new Date(),
    };

    const baseGame2: IGame = {
        gameTitle: 'Test Game2',
        description: 'Test Description2',
        gameMode: GameType.Classic,
        board: { cells: [[CellType.Empty]], items: [] },
        preview: 'image.png',
        visibility: Visibility.Hidden,
        lastModifiedDate: new Date(),
        dateCreated: new Date(),
    };

    beforeEach(async () => {
        mockBoardService = sinon.createStubInstance(BoardService);
        mockBoardService.validateBoard.returns([]);

        gameService = new GameService(mockBoardService);

        gameCreateStub = sinon.stub(game, 'create');
        findByIdStub = sinon.stub(game, 'findById');
        findByIdAndUpdateStub = sinon.stub(game, 'findByIdAndUpdate');
        findByIdAndDeleteStub = sinon.stub(game, 'findByIdAndDelete');
        findStub = sinon.stub(game, 'find');
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return all games', async () => {
        const games = [
            { ...baseGame, _id: fakeGameId },
            { ...baseGame2, _id: anotherFakeGameId },
        ];

        findStub.resolves(games);

        const result = await gameService.getAllGames();

        expect(findStub.calledOnceWithExactly({})).to.equal(true);
        expect(result).to.deep.equal(games);
    });

    // Edge case: no documents in the database — getAllGames() should return an empty array
    // without throwing an exception or calling an unexpected method.
    it('should return empty array if no games exist', async () => {
        findStub.resolves([]);

        const result = await gameService.getAllGames();

        expect(findStub.calledOnceWithExactly({})).to.equal(true);
        expect(result).to.deep.equal([]);
    });

    it('should return game by id', async () => {
        const existingGame = { ...baseGame, _id: fakeGameId };

        findByIdStub.resolves(existingGame);

        const result = await gameService.getGame(fakeGameId);

        expect(findByIdStub.calledOnceWithExactly(fakeGameId)).to.equal(true);
        expect(result).to.deep.equal(existingGame);
    });

    // Edge case: the provided identifier does not exist in the database — getGame() should
    // return null instead of throwing an uncontrolled exception.
    it('should return null if game does not exist', async () => {
        findByIdStub.resolves(null);

        const result = await gameService.getGame(fakeGameId);

        expect(findByIdStub.calledOnceWithExactly(fakeGameId)).to.equal(true);
        expect(result).to.equal(null);
    });

    it('should create a game with dates', async () => {
        const findOneStub = sinon.stub(game, 'findOne');
        findOneStub.resolves(null);

        const board: IBoard = {
            cells: [
                [
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                ],
                [
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Water,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                ],
                [
                    CellType.Wall,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                    CellType.Water,
                ],
                [
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                    CellType.Water,
                    CellType.Ice,
                ],
                [
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Water,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                ],
                [
                    CellType.Water,
                    CellType.Wall,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                ],
                [
                    CellType.Wall,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                    CellType.Water,
                ],
                [
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                    CellType.Water,
                    CellType.Ice,
                ],
                [
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Water,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                ],
                [
                    CellType.Water,
                    CellType.Wall,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                    CellType.Water,
                    CellType.Ice,
                    CellType.Water,
                    CellType.Wall,
                ],
            ],
            items: [
                {
                    itemType: ItemType.StartingPosition,
                    x: 0,
                    y: 0,
                    size: 1,
                },
                {
                    itemType: ItemType.StartingPosition,
                    x: 3,
                    y: 3,
                    size: 1,
                },
                {
                    itemType: ItemType.FightSanctuary,
                    x: 1,
                    y: 1,
                    size: 4,
                },
            ],
        };

        const mockGameData: IGame = {
            gameTitle: 'Test Game',
            description: 'Test Description',
            gameMode: GameType.Classic,
            board,
            preview: 'image.png',
            lastModifiedDate: new Date(),
            dateCreated: new Date(),
            visibility: Visibility.Hidden,
        };

        gameCreateStub.resolves({
            ...mockGameData,
            visibility: 'hidden',
            dateCreated: sinon.match.date,
            lastModifiedDate: sinon.match.date,
            _id: '123',
        });

        const result = await gameService.createGame(mockGameData);

        void expect(result.dateCreated).to.exist;
        void expect(result.lastModifiedDate).to.exist;

        findOneStub.restore();
    });

    // Edge case: description missing from the payload (field absent vs empty).
    it('should throw an error when description is missing', async () => {
        const mockGameData = {
            gameTitle: 'Test Game',
            gameMode: 'classic',
            board: { cells: [CellType.Empty], items: [ItemType.FightSanctuary] },
            preview: 'image.png',
        };

        try {
            await gameService.createGame(mockGameData as unknown as IGame);
            throw new Error('Should have thrown an error');
        } catch (error) {
            expect((error as Error).message).to.equal("Il n'y a pas de description");
        }
    });

    // Edge case: description present but empty string ("").
    it('should throw an error when description is empty', async () => {
        const mockGameData = {
            gameTitle: 'Test Game',
            description: '',
            gameMode: 'classic',
            board: { cells: [CellType.Empty], items: [ItemType.FightSanctuary] },
            preview: 'image.png',
        };

        try {
            await gameService.createGame(mockGameData as unknown as IGame);
            throw new Error('Should have thrown an error');
        } catch (error) {
            expect((error as Error).message).to.equal("Il n'y a pas de description");
        }
    });

    // Edge case: description containing only whitespace — should be treated as absent after trim().
    it('should throw when description contains only spaces', async () => {
        const mockGameData = {
            gameTitle: 'Valid title',
            description: '     ',
            gameMode: 'classic',
            board: { cells: [CellType.Empty], items: [ItemType.FightSanctuary] },
            preview: 'image.png',
        };

        try {
            await gameService.createGame(mockGameData as unknown as IGame);
            throw new Error('Should have thrown');
        } catch (error) {
            expect(error.message).to.equal("Il n'y a pas de description");
        }
    });

    // Edge case: description exceeding exactly the maximum allowed (BAD_DESCRIPTION_LENGTH).
    // Tests the upper bound of the length constraint.
    it('should throw an error when description is longer than 200 characters', async () => {
        const mockGameData = {
            gameTitle: 'Test Game',
            description: 'a'.repeat(BAD_DESCRIPTION_LENGTH), // 201 chars
            gameMode: 'classic',
            board: { cells: [CellType.Empty], items: [ItemType.FightSanctuary] },
            preview: 'image.png',
        };

        try {
            await gameService.createGame(mockGameData as unknown as IGame);
            throw new Error('Should have thrown an error');
        } catch (error) {
            expect(error.message).to.equal('La description ne peut pas dépasser 200 caractères');
        }
    });
    // Edge case: the route parameter is an array (Express can return an array
    // when the key is duplicated in the query string).
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

    // Edge case: the route parameter is of an unexpected type (boolean).
    // The method should return null without crashing.
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

    it('should throw an error when gameTitle is missing', async () => {
        const mockGameData = {
            description: 'Test Description',
            gameMode: 'classic',
            board: { cells: [CellType.Empty], items: [ItemType.FightSanctuary] },
            preview: 'image.png',
        };

        try {
            await gameService.createGame(mockGameData as unknown as IGame);
            throw new Error('Should have thrown an error');
        } catch (error) {
            expect((error as Error).message).to.equal("Il n'y a pas de titre");
        }
    });

    it('should throw an error when gameTitle is empty', async () => {
        const mockGameData = {
            gameTitle: '',
            description: 'Test Description',
            gameMode: 'classic',
            board: { cells: [CellType.Empty], items: [ItemType.FightSanctuary] },
            preview: 'image.png',
        };

        try {
            await gameService.createGame(mockGameData as unknown as IGame);
            throw new Error('Should have thrown an error');
        } catch (error) {
            expect((error as Error).message).to.equal("Il n'y a pas de titre");
        }
    });

    // Edge case: title containing only whitespace — should be considered absent after trim().
    it('should throw when gameTitle contains only spaces', async () => {
        const mockGameData = {
            gameTitle: '     ',
            description: 'Valid description',
            gameMode: 'classic',
            board: { cells: [CellType.Empty], items: [ItemType.FightSanctuary] },
            preview: 'image.png',
        };

        try {
            await gameService.createGame(mockGameData as unknown as IGame);
            throw new Error('Should have thrown');
        } catch (error) {
            expect(error.message).to.equal("Il n'y a pas de titre");
        }
    });

    // Edge case: title exceeding exactly the maximum allowed (BAD_TITLE_LENGTH).
    // Tests the upper bound of the length constraint.
    it('should throw an error when gameTitle is longer than 50 characters', async () => {
        const mockGameData = {
            gameTitle: 'a'.repeat(BAD_TITLE_LENGTH), // 51 chars
            description: 'Test Description',
            gameMode: 'classic',
            board: { cells: [CellType.Empty], items: [ItemType.FightSanctuary] },
            preview: 'image.png',
        };

        try {
            await gameService.createGame(mockGameData as unknown as IGame);
            throw new Error('Should have thrown an error');
        } catch (error) {
            expect(error.message).to.equal('Le titre ne peut pas dépasser 50 caractères');
        }
    });
    // Edge case: game mode outside the enumeration (arbitrary value) — should be rejected.
    it('should throw an error when gameMode is invalid', async () => {
        const mockGameData = {
            gameTitle: 'Test Game',
            description: 'Test Description',
            gameMode: 'invalidMode',
            board: { cells: [CellType.Empty], items: [ItemType.FightSanctuary] },
            preview: 'image.png',
        };

        try {
            await gameService.createGame(mockGameData as unknown as IGame);
            throw new Error('Should have thrown an error');
        } catch (error) {
            expect((error as Error).message).to.equal('Mode de jeu invalide');
        }
    });

    it('should throw an error when board is missing', async () => {
        const mockGameData = {
            gameTitle: 'Test Game',
            description: 'Test Description',
            gameMode: 'classic',
            preview: 'image.png',
        };

        try {
            await gameService.createGame(mockGameData as unknown as IGame);
            throw new Error('Should have thrown an error');
        } catch (error) {
            expect((error as Error).message).to.equal("Il n'y a pas de carte");
        }
    });

    it('should throw an error when preview is missing', async () => {
        const mockGameData = {
            gameTitle: 'Test Game',
            description: 'Test Description',
            gameMode: 'classic',
            board: { cells: [CellType.Empty], items: [ItemType.FightSanctuary] },
        };

        try {
            await gameService.createGame(mockGameData as unknown as IGame);
            throw new Error('Should have thrown an error');
        } catch (error) {
            expect((error as Error).message).to.equal('Il manque une image de preview du jeu');
        }
    });

    it('should throw an error when board is invalid', async () => {
        mockBoardService.validateBoard.returns(['Moins de 50% de la surface totale de la carte est couverte par des tuiles.']);
        const mockGameData = {
            gameTitle: 'Test Game',
            description: 'Test Description',
            gameMode: 'classic',
            board: { cells: [CellType.Empty], items: [ItemType.FightSanctuary] },
            preview: 'image.png',
        };

        try {
            await gameService.createGame(mockGameData as unknown as IGame);
            throw new Error('Should have thrown an error');
        } catch (error) {
            expect((error as Error).message).to.include('Moins de 50% de la surface totale de la carte est couverte par des tuiles.');
        }
    });

    it('should throw an error when game title already exists', async () => {
        const findOneStub = sinon.stub(game, 'findOne');
        findOneStub.resolves({ ...baseGame, _id: fakeGameId } as never);

        const mockGameData = {
            ...baseGame,
            gameTitle: 'Test Game',
        };

        try {
            await gameService.createGame(mockGameData);
            throw new Error('Should have thrown an error');
        } catch (error) {
            expect((error as Error).message).to.equal('Un jeu avec ce nom existe déjà');
        }

        findOneStub.restore();
    });

    it('should create game when title is unique', async () => {
        const findOneStub = sinon.stub(game, 'findOne');
        findOneStub.resolves(null);
        gameCreateStub.resolves(baseGame);

        const mockGameData = {
            ...baseGame,
            gameTitle: 'Unique Game',
        };

        const result = await gameService.createGame(mockGameData);

        expect(findOneStub.calledOnce).to.equal(true);
        expect(gameCreateStub.calledOnce).to.equal(true);
        expect(result).to.deep.equal(baseGame);

        findOneStub.restore();
    });

    // deleteGame tests
    it('should delete a game successfully', async () => {
        findByIdAndDeleteStub.resolves(baseGame);

        await gameService.deleteGame(fakeGameId);

        expect(findByIdAndDeleteStub.calledOnceWithExactly(fakeGameId)).to.equal(true);
    });

    // Edge case: the game targeted by deleteGame() no longer exists in the database.
    // The operation should fail with an explicit message rather than succeed silently.
    it('should throw error if game to delete does not exist', async () => {
        findByIdAndDeleteStub.resolves(null);

        try {
            await gameService.deleteGame(fakeGameId);
            throw new Error('Should have thrown an error');
        } catch (error) {
            expect((error as Error).message).to.equal('Jeu déjà supprimé');
        }
    });
    // changeVisibility tests
    it('should change visibility successfully', async () => {
        const saveStub = sinon.stub().resolves({ ...baseGame, visibility: Visibility.Viewable });
        findByIdStub.resolves({ ...baseGame, save: saveStub });

        const result = await gameService.changeVisibility(fakeGameId, Visibility.Viewable);

        expect(result.visibility).to.equal(Visibility.Viewable);
        expect(findByIdStub.calledOnceWithExactly(fakeGameId)).to.equal(true);
        expect(saveStub.calledOnce).to.equal(true);
    });

    it('should throw error if game does not exist on changeVisibility', async () => {
        findByIdStub.resolves(null);

        try {
            await gameService.changeVisibility(fakeGameId, Visibility.Viewable);
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.equal('Jeu introuvable');
        }
    });
    // Edge case: invalid visibility (value outside the Visibility enum).
    it('should throw error if visibility is invalid', async () => {
        findByIdStub.resolves(baseGame);

        try {
            await gameService.changeVisibility(fakeGameId, 'INVALID_VISIBILITY' as Visibility);
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.equal('Visibilité invalide');
        }
    });
    // updateGame tests
    it('should update a game successfully', async () => {
        const updatedData = { ...baseGame, gameTitle: 'Updated Title' };
        const findOneStub = sinon.stub(game, 'findOne');

        findByIdStub.resolves(baseGame);
        findOneStub.resolves(null);
        findByIdAndUpdateStub.resolves(updatedData);

        const { game: updatedGame, created } = await gameService.updateGame(fakeGameId, updatedData);

        expect(updatedGame.gameTitle).to.equal('Updated Title');
        expect(created).to.equal(false);
        expect(findByIdStub.calledOnceWithExactly(fakeGameId)).to.equal(true);
        expect(findByIdAndUpdateStub.calledOnce).to.equal(true);
    });
    // Edge case: the game to update was deleted between the read and
    // write (race condition). updateGame() should create a new game.
    it('should create game if game to update does not exist', async () => {
        const findOneStub = sinon.stub(game, 'findOne');
        findOneStub.resolves(null);
        findByIdStub.resolves(null);

        const createdGame = { ...baseGame, _id: fakeGameId };
        gameCreateStub.resolves(createdGame);

        const result = await gameService.updateGame(fakeGameId, baseGame);
        expect(gameCreateStub.calledOnce).to.equal(true);
        expect(gameCreateStub.calledWith(baseGame)).to.equal(true);
        expect(result).to.deep.equal({ game: createdGame, created: true });
    });
    it('should throw error if game data to update is invalid', async () => {
        findByIdStub.resolves(baseGame);

        const invalidGameData = {
            ...baseGame,
            gameTitle: '',
        };
        try {
            await gameService.updateGame(fakeGameId, invalidGameData);
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.equal("Il n'y a pas de titre");
        }
    });

    // Edge case: renaming a game to a title already used by another game.
    it('should throw error if updating game title to an existing title', async () => {
        const findOneStub = sinon.stub(game, 'findOne');
        findByIdStub.resolves(baseGame);
        findOneStub.resolves({ ...baseGame2, _id: anotherFakeGameId } as never);

        const updatedGameData = {
            ...baseGame,
            gameTitle: 'Test Game2',
        };

        try {
            await gameService.updateGame(fakeGameId, updatedGameData);
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.equal('Un jeu avec ce nom existe déjà');
        }

        findOneStub.restore();
    });
});
