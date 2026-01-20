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
    });

    it('should return false for invalid board size', () => {
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
                [CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
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
        expect(res).to.be.false;
    });

    it('should return false when board doesnt have enough starting points for small board', () => {
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
        expect(res).to.be.false;
    });

    it('should return false when board doesnt have enough starting points for mid board', () => {
        const board: IBoard = {
            "cells": [
                [CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Ice, CellType.Water, CellType.Water, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water],
                [CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water],
                [CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Water, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water],
                [CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Water, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water],
                [CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Water, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice]
            ],
            "items": [
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
                },
                {
                    "itemType": "lifeSanctuary",
                    "x": 7,
                    "y": 7,
                    "size": 4
                }
            ]
        }
        const res = boardService.validateBoard(board);
        expect(res).to.be.false;
    });

    it('should return false when board doesnt have enough starting points for large board', () => {
        const board: IBoard = {
            "cells": [
                [CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Ice, CellType.Water, CellType.Water, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice],
                [CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Water, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water],
                [CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice],
                [CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Water, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water],
                [CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice],
                [CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Water, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water],
                [CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice],
                [CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
                [CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall]
            ],
            "items": [
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
                },
                {
                    "itemType": "lifeSanctuary",
                    "x": 7,
                    "y": 7,
                    "size": 4
                },
                {
                    "itemType": "fightSanctuary",
                    "x": 13,
                    "y": 13,
                    "size": 4
                }
            ]
        }
        const res = boardService.validateBoard(board);
        expect(res).to.be.false;
    });

    it('should return false when board has unreachable ', () => {
        const board: IBoard = {
            "cells": [
                [CellType.Ice, CellType.Wall, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall, CellType.Water, CellType.Ice, CellType.Water],
                [CellType.Wall, CellType.Ice, CellType.Water, CellType.Ice, CellType.Water, CellType.Water, CellType.Water, CellType.Ice, CellType.Water, CellType.Wall],
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
                    "x": 3,
                    "y": 3,
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
        expect(res).to.be.false;
    });

    it('should return false when 50% or more of the board is empty', () => {
        const board: IBoard = {
            "cells": [
                [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty],
                [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty],
                [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Wall, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty],
                [CellType.Empty, CellType.Ice, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Ice, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Ice],
                [CellType.Ice, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Ice, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Ice, CellType.Empty],
                [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Ice, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Ice, CellType.Empty, CellType.Empty],
                [CellType.Empty, CellType.Empty, CellType.Ice, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Ice, CellType.Empty, CellType.Empty, CellType.Empty],
                [CellType.Empty, CellType.Ice, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Ice, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Ice],
                [CellType.Ice, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Ice, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Ice, CellType.Empty],
                [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Ice, CellType.Empty, CellType.Empty, CellType.Empty, CellType.Ice, CellType.Empty, CellType.Empty]
            ],
            "items": [
                {
                    "itemType": "startingPosition",
                    "x": 3,
                    "y": 3,
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
        expect(res).to.be.false;
    });

    it('should return false when the board is all walls', () => {
        const board: IBoard = {
            "cells": [
                [CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall],
                [CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall],
                [CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall],
                [CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall],
                [CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall],
                [CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall],
                [CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall],
                [CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall],
                [CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall],
                [CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall, CellType.Wall]
            ],
            "items": [
                {
                    "itemType": "startingPosition",
                    "x": 3,
                    "y": 3,
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
        expect(res).to.be.false;
    });
});
