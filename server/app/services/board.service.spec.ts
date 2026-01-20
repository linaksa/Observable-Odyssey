import { CellType } from '@app/constants';
import { IBoard } from '@app/schemas/board';
import { expect } from 'chai';
import { Container } from 'typedi';
import { BoardService } from './board.service';


describe('Board Service', () => {
    let boardService: BoardService;

    beforeEach(async () => {
        boardService = Container.get(BoardService);

    });



    it('should return true when validating a valid board', () => {
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
        }
        const res = boardService.validateBoard(board);
        expect(res).to.be.true;
    })


});
