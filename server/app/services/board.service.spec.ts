import { GameType } from '@common/game';
import { expect } from 'chai';
import { Container } from 'typedi';
import { BoardService } from './board.service';
import {
    allWallsBoard,
    ctfNoFlagMediumBoard,
    ctfNoFlagSmallBoard,
    halfTerrainBoard,
    insufficientStartingPointsLargeBoard,
    insufficientStartingPointsSmallBoard,
    invalidSizeBoard,
    unreachableBoard,
    validClassicBoard,
} from './board.service.spec.constants';

describe('Board Service', () => {
    let boardService: BoardService;

    beforeEach(async () => {
        boardService = Container.get(BoardService);
    });

    it('should return true when validating a valid board', () => {
        const board = validClassicBoard;

        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.have.lengthOf(0);
    });

    it('should return error for invalid board size', () => {
        const board = invalidSizeBoard;

        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include('La taille de la carte est invalide.');
    });

    it('should return false when board doesnt have enough starting points for small board', () => {
        const board = insufficientStartingPointsSmallBoard;

        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include('Le nombre de positions de départ est invalide.');
    });

    it('should return an error when game mode is CTF and no flag is placed (medium board)', () => {
        const board = ctfNoFlagMediumBoard;

        const errors = boardService.validateBoard(board, GameType.Ctf);

        expect(errors).to.include('En mode Capture The Flag, un drapeau doit être placé sur la carte.');
    });

    it('should return false when board doesnt have enough starting points for large board', () => {
        const board = insufficientStartingPointsLargeBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include('Le nombre de positions de départ est invalide.');
    });

    it('should return false when board has unreachable ', () => {
        const board = unreachableBoard;

        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include('Toutes les cellules de la carte ne sont pas accessibles.');
    });

    it('should return false when less than 50% of the board is terrain cells', () => {
        const board = halfTerrainBoard;

        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include('Moins de 50% de la surface totale de la carte est couverte par des tuiles.');
    });

    it('should return false when the board is all walls', () => {
        const board = allWallsBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include('Toutes les cellules de la carte ne sont pas accessibles.');
    });

    it('should tell the user if there is no flag in CTF mode', () => {
        const board = ctfNoFlagSmallBoard;

        const errors = boardService.validateBoard(board, GameType.Ctf);
        expect(errors).to.have.lengthOf(1);
    });
});
