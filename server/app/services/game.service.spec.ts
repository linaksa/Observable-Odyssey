import { game } from '@app/schemas/game';
import { CellType, IBoard } from '@common/board';
import { GameType, IGame, Visibility } from '@common/game';
import { ItemType } from '@common/items';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Container } from 'typedi';
import { BoardService } from './board.service';
import { GameService } from './game.service';

/* NOTE: The linter is deactivated for line length around the definition of the cells because we were
*  getting errors about lines being too long, but it was judged that splitting the 
*  lines in this case would decrease readability, since it would break the grid shape
*  of the cells.
*/
describe('Game Service', () => {
    let gameService: GameService;
    let mockBoardService: sinon.SinonStubbedInstance<BoardService>;
    let gameCreateStub: sinon.SinonStub;
    let findByIdStub: sinon.SinonStub;
    let findByIdAndUpdateStub: sinon.SinonStub;
    let findByIdAndDeleteStub: sinon.SinonStub;

    const fakeGameId = '507f1f77bcf86cd799439011';
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

    beforeEach(async () => {
        mockBoardService = sinon.createStubInstance(BoardService);
        mockBoardService.validateBoard.returns(true);

        Container.set(BoardService, mockBoardService);
        gameService = Container.get(GameService);

        gameCreateStub = sinon.stub(game, 'create');
        findByIdStub = sinon.stub(game, 'findById');
        findByIdAndUpdateStub = sinon.stub(game, 'findByIdAndUpdate');
        findByIdAndDeleteStub = sinon.stub(game, 'findByIdAndDelete');

    });

    afterEach(() => {
        sinon.restore();
        Container.reset();
    });

    it('should create a game with dates', async () => {
        /* eslint-disable max-len */
        const board: IBoard = {
            cells: [
                [CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Ice, CellType.Water, CellType.Water, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice],
                [CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Water, CellType.Water, CellType.Ice, CellType.Water],
                [CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice],
                [CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Water, CellType.Water, CellType.Ice, CellType.Water],
                [CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
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
        /* eslint-enable max-len */

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
        mockBoardService.validateBoard.returns(false);

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
            expect(error.message).to.equal('Le terrain de jeu est invalide');
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
            expect(error.message).to.equal('Jeu déjà supprimé ou introuvable');
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
    // updateGame tests
    it('should update a game successfully', async () => {
        const updatedData = { ...baseGame, gameTitle: 'Updated Title' };

        findByIdStub.resolves(baseGame);
        findByIdAndUpdateStub.resolves(updatedData);

        const result = await gameService.updateGame(fakeGameId, updatedData);

        expect(result.gameTitle).to.equal('Updated Title');
        expect(findByIdStub.calledOnceWithExactly(fakeGameId)).to.equal(true);
        expect(findByIdAndUpdateStub.calledOnce).to.equal(true);
    });
    it('should throw error if game to update does not exist', async () => {
        findByIdStub.resolves(null);
        try {
            await gameService.updateGame(fakeGameId, baseGame);
            throw new Error('Should have thrown');
        } catch (error) {
            expect(error.message).to.equal('Jeu introuvable');
        }
    });
    it('should throw error if game data is invalid', async () => {
        findByIdStub.resolves(baseGame);
        const invalidGameData = {
            ...baseGame,
            gameTitle: '',
        };
        try {
            await gameService.updateGame(fakeGameId, invalidGameData);
            throw new Error('Should have thrown');
        } catch (error) {
            expect(error.message).to.equal('Il n\'y a pas de titre');
        }
    });


});
