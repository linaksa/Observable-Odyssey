import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { DoorService } from '@app/services/gameplay/door-service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { IItem, ItemType } from '@common/items';
import { expect } from 'chai';
import * as sinon from 'sinon';

describe('DoorService', () => {
    let doorService: DoorService;
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
        saveActiveGameById: sinon.SinonStub;
    };
    let positionValidatorService: {
        isAdjacent: sinon.SinonStub;
    };

    beforeEach(() => {
        activeGameService = {
            getActiveGameById: sinon.stub(),
            saveActiveGameById: sinon.stub().resolves(),
        };
        positionValidatorService = {
            isAdjacent: sinon.stub().returns(true),
        };

        doorService = new DoorService(
            activeGameService as unknown as ActiveGameService,
            positionValidatorService as unknown as PositionValidatorService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should toggle a closed door to open and consume one action', async () => {
        const activeGame = createActiveGame();
        activeGame.game.board.cells[1][1] = CellType.ClosedDoor;
        activeGame.players[0].currentPosition = { x: 0, y: 1 };
        activeGame.players[0].actionsLeft = 2;
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await doorService.toggleDoor('Alice', activeGame._id, { x: 1, y: 1 });

        expect(result).to.deep.equal({
            playerId: 'Alice',
            position: { x: 1, y: 1 },
            cellType: CellType.OpenDoor,
            actionsLeft: 1,
        });
        expect(activeGame.game.board.cells[1][1]).to.equal(CellType.OpenDoor);
        expect(activeGame.players[0].actionsLeft).to.equal(1);
        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
    });

    it('should toggle an open door to closed on a second action', async () => {
        const activeGame = createActiveGame();
        activeGame.game.board.cells[1][1] = CellType.OpenDoor;
        activeGame.players[0].currentPosition = { x: 0, y: 1 };
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await doorService.toggleDoor('Alice', activeGame._id, { x: 1, y: 1 });

        expect(result.cellType).to.equal(CellType.ClosedDoor);
        expect(activeGame.game.board.cells[1][1]).to.equal(CellType.ClosedDoor);
    });

    it('should reject toggling when the door tile is occupied by a player or a flag', async () => {
        const activeGame = createActiveGame();
        activeGame.game.board.cells[1][1] = CellType.OpenDoor;
        activeGame.players[0].currentPosition = { x: 0, y: 1 };
        activeGame.players.push(createCharacter('Bob', 1, 1));
        activeGameService.getActiveGameById.resolves(activeGame);

        try {
            await doorService.toggleDoor('Alice', activeGame._id, { x: 1, y: 1 });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.contain('occupée par un joueur');
        }

        activeGame.players.pop();
        activeGame.game.board.items = [createItem(ItemType.Flag, 1, 1)];

        try {
            await doorService.toggleDoor('Alice', activeGame._id, { x: 1, y: 1 });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.contain('occupée par un drapeau');
        }
    });

    it('should reject toggling when the player is not adjacent or has no actions left', async () => {
        const activeGame = createActiveGame();
        activeGame.game.board.cells[1][1] = CellType.ClosedDoor;
        activeGame.players[0].currentPosition = { x: 0, y: 0 };
        activeGameService.getActiveGameById.resolves(activeGame);

        positionValidatorService.isAdjacent.returns(false);

        try {
            await doorService.toggleDoor('Alice', activeGame._id, { x: 1, y: 1 });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.contain('non adjacente');
        }

        positionValidatorService.isAdjacent.returns(true);
        activeGame.players[0].currentPosition = { x: 0, y: 1 };
        activeGame.players[0].actionsLeft = 0;

        try {
            await doorService.toggleDoor('Alice', activeGame._id, { x: 1, y: 1 });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.contain('Actions insuffisantes');
        }
    });

    it('should reject non-door tiles', async () => {
        const activeGame = createActiveGame();
        activeGame.players[0].currentPosition = { x: 0, y: 1 };
        activeGameService.getActiveGameById.resolves(activeGame);

        try {
            await doorService.toggleDoor('Alice', activeGame._id, { x: 1, y: 1 });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.contain("n'est pas une porte");
        }
    });
});

function createActiveGame(): IActiveGame {
    return {
        _id: 'active-game-1',
        game: {
            gameTitle: 'Door game',
            description: '',
            gameMode: GameType.Classic,
            dateCreated: new Date('2026-01-01T00:00:00.000Z'),
            lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
            visibility: Visibility.Hidden,
            board: {
                cells: [
                    [CellType.Empty, CellType.Empty, CellType.Empty],
                    [CellType.Empty, CellType.Empty, CellType.Empty],
                    [CellType.Empty, CellType.Empty, CellType.Empty],
                ],
                items: [],
            },
        },
        players: [createCharacter('Alice')],
        currentPlayerIndex: 0,
        turnOrder: ['Alice'],
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Organizer',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        turnStartTimeStamp: 0,
        currentAttack: null,
        hasFlagId: '',
    };
}

function createCharacter(name: string, x = 0, y = 0): ICharacter {
    return {
        name,
        avatar: Avatar.Avatar1,
        initialHealth: 10,
        currentHealth: 10,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints: 4,
        attackPoints: 4,
        defensePoints: 4,
        actionsLeft: 1,
        movementLeft: 4,
        victories: 0,
        hasAbandoned: false,
        startingPosition: { x, y },
        currentPosition: { x, y },

        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [] as string[],
    };
}

function createItem(itemType: ItemType, x: number, y: number): IItem {
    return {
        itemType,
        x,
        y,
        size: 1,
    };
}
