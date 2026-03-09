/**
 * Stratégie de test – BoardService
 *
 * Approche : tests unitaires paramétrés par des constantes de plateau définies
 * dans board.service.spec.constants.ts. Chaque constante représente un cas de
 * plateau différent, ce qui permet de couvrir exhaustivement les règles de
 * validation sans dupliquer le code de construction de plateau dans les tests.
 * Le service est obtenu via le conteneur TypeDI pour respecter l'injection de
 * dépendances utilisée en production.
 *
 * Cas limites couverts :
 * - Plateau entièrement muré (allWallsBoard) : cas extrême où aucune cellule
 *   n'est accessible, ce qui doit déclencher l'erreur d'accessibilité.
 * - Moins de 50 % de terrain (halfTerrainBoard) : vérifie la borne exacte de
 *   la règle des 50 % de surface de terrain.
 * - Porte en bord de carte (edgeDoorBoard / topEdgeDoorBoard) : une porte placée
 *   sur le rebord n'a pas de voisins suffisants pour être valide.
 * - Porte avec un seul mur voisin (verticalDoorTopWallOnlyBoard) : vérifie que
 *   la validation exige les deux murs opposés, pas seulement l'un d'eux.
 * - Mode CTF sans drapeau (ctfNoFlagSmallBoard / ctfNoFlagMediumBoard) : vérifie
 *   que la validation dépend bien du mode de jeu passé en paramètre.
 * - Nombre de points de départ insuffisant selon la taille (small / large) :
 *   vérifie que le seuil requis varie selon la dimension du plateau.
 */
import { GameType } from '@common/game';
import { expect } from 'chai';
import { Container } from 'typedi';
import { BoardService } from './board.service';
import {
    allWallsBoard,
    ctfNoFlagMediumBoard,
    ctfNoFlagSmallBoard,
    edgeDoorBoard,
    halfTerrainBoard,
    insufficientStartingPointsLargeBoard,
    insufficientStartingPointsSmallBoard,
    invalidDoorBoard,
    invalidSizeBoard,
    topEdgeDoorBoard,
    unreachableBoard,
    validClassicBoard,
    verticalDoorTopWallOnlyBoard,
    verticalDoorWithWallsBoard,
} from './board.service.spec.constants';

describe('Board Service', () => {
    let boardService: BoardService;

    beforeEach(async () => {
        boardService = Container.get(BoardService);
    });

    it('should return no errors when validating a valid board', () => {
        const board = validClassicBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.have.lengthOf(0);
    });

    it('should return error for invalid board size', () => {
        const board = invalidSizeBoard;

        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include('La taille de la carte est invalide.');
    });

    it('should return error when board doesnt have enough starting points for small board', () => {
        const board = insufficientStartingPointsSmallBoard;

        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include('Le nombre de positions de départ est invalide.');
    });

    it('should return an error when game mode is CTF and no flag is placed (medium board)', () => {
        const board = ctfNoFlagMediumBoard;

        const errors = boardService.validateBoard(board, GameType.Ctf);

        expect(errors).to.include('En mode Capture The Flag, un drapeau doit être placé sur la carte.');
    });

    it('should return error when board doesnt have enough starting points for large board', () => {
        const board = insufficientStartingPointsLargeBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include('Le nombre de positions de départ est invalide.');
    });

    it('should return error when board has unreachable cells ', () => {
        const board = unreachableBoard;

        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include('Toutes les cellules de la carte ne sont pas accessibles.');
    });

    it('should return error when less than 50% of the board is terrain cells', () => {
        const board = halfTerrainBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include('Moins de 50% de la surface totale de la carte est couverte par des tuiles.');
    });

    it('should return error when the board is all walls', () => {
        const board = allWallsBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include('Toutes les cellules de la carte ne sont pas accessibles.');
    });

    it('should tell the user if there is no flag in CTF mode', () => {
        const board = ctfNoFlagSmallBoard;

        const errors = boardService.validateBoard(board, GameType.Ctf);
        expect(errors).to.have.lengthOf(1);
    });

    it('should return an error when a door doesnt have wall on both axes', () => {
        const board = invalidDoorBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include("Chaque porte doit être entre deux murs sur un axe et avoir du terrain sur l'autre axe.");
    });

    it('should return an error when a door is placed on the edge', () => {
        const board = edgeDoorBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include("Chaque porte doit être entre deux murs sur un axe et avoir du terrain sur l'autre axe.");
    });

    it('should return an error when a door is placed on the top edge between walls', () => {
        const board = topEdgeDoorBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include("Chaque porte doit être entre deux murs sur un axe et avoir du terrain sur l'autre axe.");
    });

    it('should return an error when only the top neighbor is a wall in vertical check', () => {
        const board = verticalDoorTopWallOnlyBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.include("Chaque porte doit être entre deux murs sur un axe et avoir du terrain sur l'autre axe.");
    });

    it('should validate a vertical door between walls with terrain on sides', () => {
        const board = verticalDoorWithWallsBoard;
        const errors = boardService.validateBoard(board, GameType.Classic);
        expect(errors).to.not.include("Chaque porte doit être entre deux murs sur un axe et avoir du terrain sur l'autre axe.");
    });
});
