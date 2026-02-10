/* eslint-disable max-lines */

import { GameController } from '@app/controllers/game.controller';
import { game } from '@app/schemas/game';
import { CellType, IBoard } from '@common/board';
import { GameType, IGame, Visibility } from '@common/game';
import { ItemType } from '@common/items';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { AdminSocketsService } from './admin-sockets.service';
import { BoardService } from './board.service';
import { GameService } from './game.service';

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

    it('should return null if game does not exist', async () => {
        findByIdStub.resolves(null);

        const result = await gameService.getGame(fakeGameId);

        expect(findByIdStub.calledOnceWithExactly(fakeGameId)).to.equal(true);
        expect(result).to.equal(null);
    });

    it('should create a game with dates', async () => {
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
                    itemType: 'startingPosition',
                    x: 0,
                    y: 0,
                    size: 1,
                },
                {
                    itemType: 'startingPosition',
                    x: 3,
                    y: 3,
                    size: 1,
                },
                {
                    itemType: 'fightSanctuary',
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
    });

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
            expect(error.message).to.equal("Il n'y a pas de description");
        }
    });

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
            expect(error.message).to.equal("Il n'y a pas de description");
        }
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
            expect(error.message).to.equal("Il n'y a pas de titre");
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
            expect(error.message).to.equal("Il n'y a pas de titre");
        }
    });

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
            expect(error.message).to.equal('Mode de jeu invalide');
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
            expect(error.message).to.equal("Il n'y a pas de carte");
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
            expect(error.message).to.equal('Il manque une image de preview du jeu');
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
            expect(error.message).to.include('Moins de 50% de la surface totale de la carte est couverte par des tuiles.');
        }
    });
    // deleteGame tests
    it('should delete a game successfully', async () => {
        findByIdAndDeleteStub.resolves(baseGame);

        await gameService.deleteGame(fakeGameId);

        expect(findByIdAndDeleteStub.calledOnceWithExactly(fakeGameId)).to.equal(true);
    });

    it('should throw error if game to delete does not exist', async () => {
        findByIdAndDeleteStub.resolves(null);

        try {
            await gameService.deleteGame(fakeGameId);
            throw new Error('Should have thrown an error');
        } catch (error) {
            expect(error.message).to.equal('Jeu déjà supprimé');
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
            expect(error.message).to.equal('Jeu introuvable');
        }
    });
    it('should throw error if visibility is invalid', async () => {
        findByIdStub.resolves(baseGame);

        try {
            await gameService.changeVisibility(fakeGameId, 'INVALID_VISIBILITY' as Visibility);
            throw new Error('Should have thrown');
        } catch (error) {
            expect(error.message).to.equal('Visibilité invalide');
        }
    });
    // updateGame tests
    it('should update a game successfully', async () => {
        const updatedData = { ...baseGame, gameTitle: 'Updated Title' };

        findByIdStub.resolves(baseGame);
        findByIdAndUpdateStub.resolves(updatedData);

        const { game: updatedGame, created } = await gameService.updateGame(fakeGameId, updatedData);

        expect(updatedGame.gameTitle).to.equal('Updated Title');
        expect(created).to.equal(false);
        expect(findByIdStub.calledOnceWithExactly(fakeGameId)).to.equal(true);
        expect(findByIdAndUpdateStub.calledOnce).to.equal(true);
    });
    it('should create game if game to update does not exist', async () => {
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
            expect(error.message).to.equal("Il n'y a pas de titre");
        }
    });
});
