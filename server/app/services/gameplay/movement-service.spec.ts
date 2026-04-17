/* eslint-disable max-lines -- MovementService branch coverage scenarios are intentionally grouped in one cohesive suite. */
/**
 * Testing strategy — MovementService
 *
 * Approach:
 * - Drive movePlayer(), getReachablePositions(), and movement-cost helpers using deterministic board fixtures and stubbed persistence/socket/log services.
 * - Assert movement side effects on player state, flag ownership, persistence calls, and emitted gameplay updates.
 *
 * Edge cases covered:
 * - Missing game/player, wrong-turn attempts, preparation-phase locks, non-adjacent targets, occupancy conflicts, and insufficient movement budgets.
 * - Closed-door and sanctuary-blocked path rejection while allowing tiles occupied only by abandoned players.
 * - CTF flag carry/pickup branches and no-pickup path when another carrier already exists.
 */
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { MovementService } from '@app/services/gameplay/movement-service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType, ICE_MOVEMENT_COST, WATER_MOVEMENT_COST } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { ItemType } from '@common/items';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';

const PLAYER_INDEX_ALICE = 0;
const X_RIGHT = 2;
const Y_MIDDLE = 1;
const X_CENTER = 1;
const LOW_MOVEMENT = 0;

describe('MovementService', () => {
    let movementService: MovementService;
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
        saveActiveGameById: sinon.SinonStub;
    };
    let socketService: {
        getNamespace: sinon.SinonStub;
    };
    let gameplayLogService: {
        emitGameLogToRoom: sinon.SinonStub;
    };
    let namespaceEmitStub: sinon.SinonStub;

    beforeEach(() => {
        activeGameService = {
            getActiveGameById: sinon.stub(),
            saveActiveGameById: sinon.stub().resolves(),
        };
        namespaceEmitStub = sinon.stub();
        socketService = {
            getNamespace: sinon.stub().returns({
                to: sinon.stub().returns({ emit: namespaceEmitStub }),
            }),
        };

        gameplayLogService = {
            emitGameLogToRoom: sinon.stub(),
        };

        movementService = new MovementService(
            activeGameService as unknown as ActiveGameService,
            new PositionValidatorService(),
            socketService as unknown as SocketService,
            gameplayLogService as unknown as GameplayLogService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should move through an open door and consume one movement point', async () => {
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await movementService.movePlayer('Alice', activeGame._id, { x: X_RIGHT, y: Y_MIDDLE });

        expect(result).to.deep.equal({
            playerId: 'Alice',
            newPosition: { x: X_RIGHT, y: Y_MIDDLE },
            movementLeft: LOW_MOVEMENT,
        });
        expect(activeGame.players[PLAYER_INDEX_ALICE].currentPosition).to.deep.equal({ x: X_RIGHT, y: Y_MIDDLE });
        expect(activeGame.players[PLAYER_INDEX_ALICE].movementLeft).to.equal(LOW_MOVEMENT);
        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
    });

    it('should reject moving through a closed door', async () => {
        const activeGame = createActiveGame();
        activeGame.game.board.cells[Y_MIDDLE][X_RIGHT] = CellType.ClosedDoor;
        activeGameService.getActiveGameById.resolves(activeGame);

        try {
            await movementService.movePlayer('Alice', activeGame._id, { x: X_RIGHT, y: Y_MIDDLE });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.equal('Position non marchable');
        }
    });

    it('should reject moving onto a sanctuary tile', async () => {
        const activeGame = createActiveGame();
        activeGame.players[PLAYER_INDEX_ALICE].currentPosition = { x: LOW_MOVEMENT, y: Y_MIDDLE };
        activeGame.players[PLAYER_INDEX_ALICE].movementLeft = 1;
        activeGame.game.board.items = [createSanctuary(X_CENTER, Y_MIDDLE)];
        activeGameService.getActiveGameById.resolves(activeGame);

        try {
            await movementService.movePlayer('Alice', activeGame._id, { x: X_CENTER, y: Y_MIDDLE });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.equal('Position non marchable');
        }
    });

    it('should allow moving onto a tile occupied only by an abandoned player', async () => {
        const activeGame = createActiveGame();
        activeGame.players = [
            {
                ...activeGame.players[0],
                name: 'Alice',
                currentPosition: { x: LOW_MOVEMENT, y: Y_MIDDLE },
                movementLeft: 1,
            },
            {
                ...createCharacter('Bob'),
                hasAbandoned: true,
                currentPosition: { x: X_CENTER, y: Y_MIDDLE },
                startingPosition: { x: X_CENTER, y: Y_MIDDLE },
            },
        ];
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await movementService.movePlayer('Alice', activeGame._id, { x: X_CENTER, y: Y_MIDDLE });

        expect(result.newPosition).to.deep.equal({ x: X_CENTER, y: Y_MIDDLE });
        expect(activeGame.players[PLAYER_INDEX_ALICE].currentPosition).to.deep.equal({ x: X_CENTER, y: Y_MIDDLE });
    });

    it('should list open doors as reachable and exclude closed doors', async () => {
        const activeGame = createActiveGame();
        activeGame.players[PLAYER_INDEX_ALICE].movementLeft = 1;
        activeGameService.getActiveGameById.resolves(activeGame);

        const reachable = await movementService.getReachablePositions('Alice', activeGame._id);

        expect(reachable).to.deep.equal([{ x: X_RIGHT, y: Y_MIDDLE }]);
    });

    it('returns no reachable positions when game is missing', async () => {
        activeGameService.getActiveGameById.resolves(null);

        const reachable = await movementService.getReachablePositions('Alice', 'missing-game');

        expect(reachable).to.deep.equal([]);
    });

    it('returns no reachable positions when player is missing', async () => {
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);

        const reachable = await movementService.getReachablePositions('Missing', activeGame._id);

        expect(reachable).to.deep.equal([]);
    });

    it('throws when game is missing while moving', async () => {
        activeGameService.getActiveGameById.resolves(null);

        try {
            await movementService.movePlayer('Alice', 'missing-game', { x: X_RIGHT, y: Y_MIDDLE });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.equal('Partie active introuvable.');
        }
    });

    it('throws when player is missing while moving', async () => {
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);

        try {
            await movementService.movePlayer('Missing', activeGame._id, { x: X_RIGHT, y: Y_MIDDLE });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.equal('Joueur introuvable.');
        }
    });

    it('throws when player tries to move outside their turn', async () => {
        const activeGame = createActiveGame();
        activeGame.turnOrder = ['Bob', 'Alice'];
        activeGame.currentPlayerIndex = PLAYER_INDEX_ALICE;
        activeGameService.getActiveGameById.resolves(activeGame);

        try {
            await movementService.movePlayer('Alice', activeGame._id, { x: X_RIGHT, y: Y_MIDDLE });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.equal("Ce n'est pas votre tour.");
        }
    });

    it('throws when turn is still in preparation', async () => {
        const activeGame = createActiveGame();
        activeGame.turnIsInPreparation = true;
        activeGameService.getActiveGameById.resolves(activeGame);

        try {
            await movementService.movePlayer('Alice', activeGame._id, { x: X_RIGHT, y: Y_MIDDLE });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.equal("Le tour n'a pas encore commencé.");
        }
    });

    it('throws when target tile is not adjacent', async () => {
        const activeGame = createActiveGame();
        activeGame.players[PLAYER_INDEX_ALICE].movementLeft = 2;
        activeGame.players[PLAYER_INDEX_ALICE].currentPosition = { x: LOW_MOVEMENT, y: Y_MIDDLE };
        activeGameService.getActiveGameById.resolves(activeGame);

        try {
            await movementService.movePlayer('Alice', activeGame._id, { x: X_RIGHT, y: Y_MIDDLE });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.equal('La case ciblée est non adjacente.');
        }
    });

    it('throws when target tile is occupied by a non-abandoned player', async () => {
        const activeGame = createActiveGame();
        activeGame.players.push({
            ...createCharacter('Bob'),
            currentPosition: { x: X_RIGHT, y: Y_MIDDLE },
            startingPosition: { x: X_RIGHT, y: Y_MIDDLE },
            hasAbandoned: false,
        });
        activeGameService.getActiveGameById.resolves(activeGame);

        try {
            await movementService.movePlayer('Alice', activeGame._id, { x: X_RIGHT, y: Y_MIDDLE });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.equal('La case ciblée est occupée par un joueur.');
        }
    });

    it('throws when movement budget is insufficient for target tile', async () => {
        const activeGame = createActiveGame();
        activeGame.players[PLAYER_INDEX_ALICE].movementLeft = LOW_MOVEMENT;
        activeGameService.getActiveGameById.resolves(activeGame);

        try {
            await movementService.movePlayer('Alice', activeGame._id, { x: X_RIGHT, y: Y_MIDDLE });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.equal('Mouvement insuffisant.');
        }
    });

    it('does not duplicate already visited positions', async () => {
        const activeGame = createActiveGame();
        activeGame.players[PLAYER_INDEX_ALICE].visitedCells = [`${X_RIGHT},${Y_MIDDLE}`];
        activeGameService.getActiveGameById.resolves(activeGame);

        await movementService.movePlayer('Alice', activeGame._id, { x: X_RIGHT, y: Y_MIDDLE });

        expect(activeGame.players[PLAYER_INDEX_ALICE].visitedCells).to.deep.equal([`${X_RIGHT},${Y_MIDDLE}`]);
    });

    it('moves carried flag with carrier in ctf mode', async () => {
        const activeGame = createActiveGame();
        activeGame.game.gameMode = GameType.Ctf;
        activeGame.hasFlagId = 'Alice';
        activeGame.game.board.items = [{ itemType: ItemType.Flag, x: X_CENTER, y: Y_MIDDLE, size: 1, isCarried: true }];
        activeGameService.getActiveGameById.resolves(activeGame);

        await movementService.movePlayer('Alice', activeGame._id, { x: X_RIGHT, y: Y_MIDDLE });

        const flag = activeGame.game.board.items[0];
        expect(flag.x).to.equal(X_RIGHT);
        expect(flag.y).to.equal(Y_MIDDLE);
    });

    it('picks up ground flag in ctf mode and emits socket/log updates', async () => {
        const activeGame = createActiveGame();
        activeGame.game.gameMode = GameType.Ctf;
        activeGame.hasFlagId = '';
        activeGame.players[PLAYER_INDEX_ALICE].currentPosition = { x: X_CENTER, y: Y_MIDDLE };
        activeGame.players[PLAYER_INDEX_ALICE].movementLeft = 1;
        activeGame.game.board.items = [{ itemType: ItemType.Flag, x: X_RIGHT, y: Y_MIDDLE, size: 1, isCarried: false }];
        activeGameService.getActiveGameById.resolves(activeGame);

        await movementService.movePlayer('Alice', activeGame._id, { x: X_RIGHT, y: Y_MIDDLE });

        expect(activeGame.hasFlagId).to.equal('Alice');
        expect(activeGame.flagHolderHistory).to.deep.equal(['Alice']);
        expect(namespaceEmitStub.calledWithExactly(SocketEvent.FlagPickedUp, { playerName: 'Alice' })).to.equal(true);
        expect(gameplayLogService.emitGameLogToRoom.calledOnceWithExactly(activeGame._id, 'Alice a ramassé un drapeau.')).to.equal(true);
        expect(socketService.getNamespace.calledWithExactly(Namespaces.Game)).to.equal(true);
    });

    it('does not pick up flag when another player already carries it', async () => {
        const activeGame = createActiveGame();
        activeGame.game.gameMode = GameType.Ctf;
        activeGame.hasFlagId = 'Bob';
        activeGame.players.push({
            ...createCharacter('Bob'),
            currentPosition: { x: LOW_MOVEMENT, y: LOW_MOVEMENT },
            startingPosition: { x: LOW_MOVEMENT, y: LOW_MOVEMENT },
        });
        activeGame.players[PLAYER_INDEX_ALICE].currentPosition = { x: X_CENTER, y: Y_MIDDLE };
        activeGame.players[PLAYER_INDEX_ALICE].movementLeft = 1;
        activeGame.game.board.items = [{ itemType: ItemType.Flag, x: X_RIGHT, y: Y_MIDDLE, size: 1, isCarried: true }];
        activeGameService.getActiveGameById.resolves(activeGame);

        await movementService.movePlayer('Alice', activeGame._id, { x: X_RIGHT, y: Y_MIDDLE });

        expect(activeGame.hasFlagId).to.equal('Bob');
        expect(namespaceEmitStub.called).to.equal(false);
        expect(gameplayLogService.emitGameLogToRoom.called).to.equal(false);
    });

    it('handles ctf movement when no flag item exists on the board', async () => {
        const activeGame = createActiveGame();
        activeGame.game.gameMode = GameType.Ctf;
        activeGame.game.board.items = [];
        activeGameService.getActiveGameById.resolves(activeGame);

        // Edge case: ctf mode without a flag item should not emit pickup events.
        const result = await movementService.movePlayer('Alice', activeGame._id, { x: X_RIGHT, y: Y_MIDDLE });

        // Nominal case: movement still succeeds and persists.
        expect(result.newPosition).to.deep.equal({ x: X_RIGHT, y: Y_MIDDLE });
        expect(namespaceEmitStub.called).to.equal(false);
        expect(gameplayLogService.emitGameLogToRoom.called).to.equal(false);
    });

    it('excludes neighbors occupied by active players from reachable positions', async () => {
        const activeGame = createActiveGame();
        activeGame.players.push({
            ...createCharacter('Bob'),
            currentPosition: { x: X_RIGHT, y: Y_MIDDLE },
            startingPosition: { x: X_RIGHT, y: Y_MIDDLE },
        });
        activeGameService.getActiveGameById.resolves(activeGame);

        // Edge case: reachable search skips an occupied adjacent tile.
        const reachable = await movementService.getReachablePositions('Alice', activeGame._id);
        expect(reachable).to.deep.equal([]);
    });

    it('computes movement cost for ice, water, and unknown terrain cells', () => {
        const activeGame = createActiveGame();
        activeGame.game.board.cells = [[CellType.Ice, CellType.Water, 'mystery' as CellType]];
        const privateService = movementService as unknown as {
            getPriceTile: (game: IActiveGame, position: { x: number; y: number }) => number;
        };

        expect(privateService.getPriceTile(activeGame, { x: 0, y: 0 })).to.equal(ICE_MOVEMENT_COST);
        expect(privateService.getPriceTile(activeGame, { x: 1, y: 0 })).to.equal(WATER_MOVEMENT_COST);
        expect(privateService.getPriceTile(activeGame, { x: 2, y: 0 })).to.equal(Infinity);
    });

    it('returns Infinity for out-of-bounds positions and malformed boards', () => {
        const activeGame = createActiveGame();
        const privateService = movementService as unknown as {
            getPriceTile: (game: IActiveGame, position: { x: number; y: number }) => number;
        };

        // Edge case: missing board metadata fails bounds validation immediately.
        const malformedGame = { ...activeGame, game: { ...activeGame.game, board: undefined } } as unknown as IActiveGame;
        expect(privateService.getPriceTile(malformedGame, { x: 0, y: 0 })).to.equal(Infinity);

        // Edge case: y below/above bounds and x out of bounds all return Infinity.
        expect(privateService.getPriceTile(activeGame, { x: 1, y: -1 })).to.equal(Infinity);
        expect(privateService.getPriceTile(activeGame, { x: 1, y: 3 })).to.equal(Infinity);
        expect(privateService.getPriceTile(activeGame, { x: -1, y: 1 })).to.equal(Infinity);
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
        flagHolderHistory: [],
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
        startingPosition: { x: 1, y: 1 },
        currentPosition: { x: 1, y: 1 },

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
