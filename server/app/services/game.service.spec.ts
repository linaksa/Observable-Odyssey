import { game } from '@app/schemas/game';
import { CellType, IBoard } from '@common/board';
import { ItemType } from '@common/items';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Container } from 'typedi';
import { BoardService } from './board.service';
import { GameService } from './game.service';


describe('Game Service', () => {
    let gameService: GameService;
    let mockBoardService: sinon.SinonStubbedInstance<BoardService>;
    let gameCreateStub: sinon.SinonStub;

    beforeEach(async () => {
        mockBoardService = sinon.createStubInstance(BoardService);
        mockBoardService.validateBoard.returns(true);

        Container.set(BoardService, mockBoardService);
        gameService = Container.get(GameService);

        gameCreateStub = sinon.stub(game, 'create');
    });

    afterEach(() => {
        sinon.restore();
        Container.reset();
    });

    it('should create a game with dates', async () => {
        const board: IBoard = {
            "cells": [
                [CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Ice, CellType.Water, CellType.Water, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice],
                [CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Water, CellType.Water, CellType.Ice, CellType.Water],
                [CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice],
                [CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Water, CellType.Water, CellType.Ice, CellType.Water],
                [CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall]
            ],
            "items": [
                {
                    "itemType": "startingPosition",
                    "x": 0,
                    "y": 0,
                    "size": 1
                },
                {
                    "itemType": "startingPosition",
                    "x": 3,
                    "y": 3,
                    "size": 1
                },
                {
                    "itemType": "fightSanctuary",
                    "x": 1,
                    "y": 1,
                    "size": 4
                }
            ]
        };

        const mockGameData = {
            gameTitle: 'Test Game',
            description: 'Test Description',
            gameMode: 'classic',
            board: board,
            preview: 'image.png'
        };

        gameCreateStub.resolves({
            ...mockGameData,
            visibility: 'hidden',
            dateCreated: sinon.match.date,
            lastModifiedDate: sinon.match.date,
            _id: '123'
        });

        const result = await gameService.createGame(mockGameData as any);

        expect(result.dateCreated).to.exist;
        expect(result.lastModifiedDate).to.exist;
    });

    it('should throw an error when description is missing', async () => {
        const mockGameData = {
            gameTitle: 'Test Game',
            gameMode: 'classic',
            board: { cells: [CellType.Empty], items: [ItemType.FightSanctuary] },
            preview: 'image.png'
        };

        try {
            await gameService.createGame(mockGameData as any);
            expect.fail('Should have thrown an error');
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
            preview: 'image.png'
        };

        try {
            await gameService.createGame(mockGameData as any);
            expect.fail('Should have thrown an error');
        } catch (error) {
            expect(error.message).to.equal("Il n'y a pas de description");
        }
    });

    it('should throw an error when gameTitle is missing', async () => {
        const mockGameData = {
            description: 'Test Description',
            gameMode: 'classic',
            board: { cells: [CellType.Empty], items: [ItemType.FightSanctuary] },
            preview: 'image.png'
        };

        try {
            await gameService.createGame(mockGameData as any);
            expect.fail('Should have thrown an error');
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
            preview: 'image.png'
        };

        try {
            await gameService.createGame(mockGameData as any);
            expect.fail('Should have thrown an error');
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
            preview: 'image.png'
        };

        try {
            await gameService.createGame(mockGameData as any);
            expect.fail('Should have thrown an error');
        } catch (error) {
            expect(error.message).to.equal('Mode de jeu invalide');
        }
    });

    it('should throw an error when board is missing', async () => {
        const mockGameData = {
            gameTitle: 'Test Game',
            description: 'Test Description',
            gameMode: 'classic',
            preview: 'image.png'
        };

        try {
            await gameService.createGame(mockGameData as any);
            expect.fail('Should have thrown an error');
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
            await gameService.createGame(mockGameData as any);
            expect.fail('Should have thrown an error');
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
            preview: 'image.png'
        };

        try {
            await gameService.createGame(mockGameData as any);
            expect.fail('Should have thrown an error');
        } catch (error) {
            expect(error.message).to.equal('Le terrain de jeu est invalide');
        }
    });

});
