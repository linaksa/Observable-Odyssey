import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { MovementService } from '@app/services/gameplay/movement-service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { ItemType } from '@common/items';
import { expect } from 'chai';
import * as sinon from 'sinon';

describe('MovementService', () => {
    let movementService: MovementService;
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
        saveActiveGameById: sinon.SinonStub;
    };
    let socketService: {
        getNamespace: sinon.SinonStub;
    };

    beforeEach(() => {
        activeGameService = {
            getActiveGameById: sinon.stub(),
            saveActiveGameById: sinon.stub().resolves(),
        };

        movementService = new MovementService(
            activeGameService as unknown as ActiveGameService,
            new PositionValidatorService(),
            socketService as unknown as SocketService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should move through an open door and consume one movement point', async () => {
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await movementService.movePlayer('Alice', activeGame._id, { x: 2, y: 1 });

        expect(result).to.deep.equal({
            newPosition: { x: 2, y: 1 },
            movementLeft: 0,
        });
        expect(activeGame.players[0].positionGrille).to.deep.equal({ x: 2, y: 1 });
        expect(activeGame.players[0].movementLeft).to.equal(0);
        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
    });

    it('should reject moving through a closed door', async () => {
        const activeGame = createActiveGame();
        activeGame.game.board.cells[1][2] = CellType.ClosedDoor;
        activeGameService.getActiveGameById.resolves(activeGame);

        try {
            await movementService.movePlayer('Alice', activeGame._id, { x: 2, y: 1 });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.equal('Position non marchable');
        }
    });

    it('should reject moving onto a sanctuary tile', async () => {
        const activeGame = createActiveGame();
        activeGame.players[0].positionGrille = { x: 0, y: 1 };
        activeGame.players[0].movementLeft = 1;
        activeGame.game.board.items = [createSanctuary(1, 1)];
        activeGameService.getActiveGameById.resolves(activeGame);

        try {
            await movementService.movePlayer('Alice', activeGame._id, { x: 1, y: 1 });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.equal('Position non marchable');
        }
    });

    it('should list open doors as reachable and exclude closed doors', async () => {
        const activeGame = createActiveGame();
        activeGame.players[0].movementLeft = 1;
        activeGameService.getActiveGameById.resolves(activeGame);

        const reachable = await movementService.getReachablePositions('Alice', activeGame._id);

        expect(reachable).to.deep.equal([{ x: 2, y: 1 }]);
    });
});

function createActiveGame(): IActiveGame {
    return {
        _id: 'active-game-1',
        game: {
            gameTitle: 'Movement game',
            description: '',
            gameMode: GameType.Classic,
            dateCreated: new Date('2026-01-01T00:00:00.000Z'),
            lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
            visibility: Visibility.Hidden,
            board: {
                cells: [
                    [CellType.Wall, CellType.Wall, CellType.Wall],
                    [CellType.Wall, CellType.Empty, CellType.OpenDoor],
                    [CellType.Wall, CellType.ClosedDoor, CellType.Wall],
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
        hasFlagId: null,
    };
}

function createCharacter(name: string): ICharacter {
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
        movementLeft: 1,
        victories: 0,
        hasAbandoned: false,
        positionDepart: { x: 1, y: 1 },
        positionGrille: { x: 1, y: 1 },

        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [] as string[],
    };
}

function createSanctuary(x: number, y: number) {
    return {
        itemType: ItemType.LifeSanctuary,
        x,
        y,
        size: 4,
    };
}
