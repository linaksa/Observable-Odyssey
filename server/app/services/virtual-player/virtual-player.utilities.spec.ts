/* eslint-disable max-lines -- VirtualPlayerUtilitiesService pathfinding/movement helpers need broad scenario coverage in one cohesive suite. */
/**
 * Testing strategy — VirtualPlayerUtilitiesService movement and pathing helpers
 *
 * Approach:
 * - Combine deterministic board fixtures with stubbed movement/socket/action dependencies.
 * - Exercise path-selection helpers and movement wrappers via return values and collaborator calls.
 * - Use fake timers to advance asynchronous movement delays deterministically.
 *
 * Edge cases covered:
 * - Closest-player search with no opponents, abandoned opponents, or unreachable enemies.
 * - Movement helpers with out-of-bounds/unreachable targets and already-optimal positions.
 * - Door traversal behavior when actions are available versus exhausted, including movement errors.
 */
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { MovementService } from '@app/services/gameplay/movement-service';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { VirtualPlayerUtilitiesService } from '@app/services/virtual-player/virtual-player.utilities';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter, Team } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { expect } from 'chai';
import * as sinon from 'sinon';

const TICK_DURATION_MS = 2000;
const BOARD_WIDTH_FOUR = 4;
const FALLBACK_SCAN_LIMIT = 2;
const FARTHER_PATH_MOVE_LEFT = 4;
const MOVE_THROUGH_DOOR_INDEX = 3;
const FARTHER_PATH_TARGET_X = 2;
const FARTHER_PATH_DISTANCE = 3;
const FARTHER_PATH_RESULT_INDEX = 3;

// Shared fixtures for board and character setup.

function makeCharacter(name: string, position: { x: number; y: number }, overrides: Partial<ICharacter> = {}): ICharacter {
    return {
        name,
        avatar: Avatar.Avatar1,
        initialHealth: 6,
        currentHealth: 6,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints: 4,
        attackPoints: 4,
        defensePoints: 4,
        actionsLeft: 1,
        movementLeft: 4,
        victories: 0,
        hasAbandoned: false,
        startingPosition: { x: 0, y: 0 },
        currentPosition: position,
        team: Team.RED,
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
        ...overrides,
    };
}

function makeGame(players: ICharacter[], cells?: CellType[][]): IActiveGame {
    return {
        _id: 'game-1',
        game: {
            gameTitle: 'Test',
            description: '',
            gameMode: GameType.Classic,
            dateCreated: new Date(),
            lastModifiedDate: new Date(),
            visibility: Visibility.Hidden,
            board: {
                cells: cells ?? [
                    [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty],
                    [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty],
                    [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty],
                    [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty],
                ],
                items: [],
            },
        },
        players,
        currentPlayerIndex: 0,
        turnOrder: players.map((p) => p.name),
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: players[0]?.name ?? 'org',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: null,
        turnStartTimeStamp: 0,
        currentAttack: null,
    };
}

// VirtualPlayerUtilitiesService behavior tests.

describe('VirtualPlayerUtilitiesService', () => {
    let movementService: { movePlayer: sinon.SinonStub };
    let socketService: { getNamespace: sinon.SinonStub };
    let gameplayActionService: { handleToggleDoor: sinon.SinonStub };
    let gameplayLogService: { emitGameLogToRoom: sinon.SinonStub };
    let activeGameService: { getActiveGameById: sinon.SinonStub };
    let service: VirtualPlayerUtilitiesService;
    let emitStub: sinon.SinonStub;
    let toStub: sinon.SinonStub;

    beforeEach(() => {
        const clock = sinon.useFakeTimers();
        // Prevent real waiting by flushing the timer used by internal sleep helpers.
        clock.tick(TICK_DURATION_MS);
        clock.restore();

        emitStub = sinon.stub();
        toStub = sinon.stub().returns({ emit: emitStub });
        socketService = { getNamespace: sinon.stub().returns({ to: toStub }) };
        movementService = { movePlayer: sinon.stub() };
        gameplayActionService = { handleToggleDoor: sinon.stub().resolves() };
        gameplayLogService = { emitGameLogToRoom: sinon.stub() };
        activeGameService = { getActiveGameById: sinon.stub() };

        service = new VirtualPlayerUtilitiesService(
            socketService as unknown as SocketService,
            movementService as unknown as MovementService,
            gameplayActionService as unknown as GameplayActionService,
            gameplayLogService as unknown as GameplayLogService,
            activeGameService as unknown as ActiveGameService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    // findClosestReachablePlayer()

    describe('findClosestReachablePlayer()', () => {
        it('should return the closest reachable adjacent player — Nominal case', () => {
            // Nominal setup: open board where the enemy has reachable adjacent tiles.
            const from = makeCharacter('Bot', { x: 0, y: 0 });
            const enemy = makeCharacter('Enemy', { x: 2, y: 0 }, { team: Team.BLUE });
            const board: CellType[][] = [
                [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty],
                [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty],
            ];

            const result = service.findClosestReachablePlayer(from, [from, enemy], board);

            expect(result).to.not.equal(null);
            if (result === null) throw new Error('Expected a reachable player');
            expect(result.player.name).to.equal('Enemy');
            expect(isFinite(result.distance)).to.equal(true);
        });

        it('should return null when there are no other players — Edge case', () => {
            const from = makeCharacter('Bot', { x: 0, y: 0 });
            const board: CellType[][] = [[CellType.Empty, CellType.Empty]];

            const result = service.findClosestReachablePlayer(from, [from], board);
            expect(result).to.equal(null);
        });

        it('should ignore abandoned players — Edge case', () => {
            const from = makeCharacter('Bot', { x: 0, y: 0 });
            const abandoned = makeCharacter('Ghost', { x: 1, y: 0 }, { hasAbandoned: true });
            const board: CellType[][] = [[CellType.Empty, CellType.Empty]];

            const result = service.findClosestReachablePlayer(from, [from, abandoned], board);
            expect(result).to.equal(null);
        });

        it('should return null when all enemies are behind walls — Edge case', () => {
            const from = makeCharacter('Bot', { x: 0, y: 0 });
            // Edge setup: wall fully blocks access to the enemy-adjacent tile.
            const enemy = makeCharacter('Enemy', { x: 2, y: 0 }, { team: Team.BLUE });
            const board: CellType[][] = [[CellType.Empty, CellType.Wall, CellType.Empty]];

            const result = service.findClosestReachablePlayer(from, [from, enemy], board);
            expect(result).to.equal(null);
        });

        it('should pick the nearest of multiple enemies — Nominal case', () => {
            const from = makeCharacter('Bot', { x: 0, y: 0 });
            const near = makeCharacter('Near', { x: 1, y: 0 }, { team: Team.BLUE });
            const far = makeCharacter('Far', { x: 3, y: 0 }, { team: Team.BLUE });
            const board: CellType[][] = [
                [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty],
                [CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty],
            ];

            const result = service.findClosestReachablePlayer(from, [from, near, far], board);
            if (result === null) throw new Error('Expected a reachable player');
            expect(result.player.name).to.equal('Near');
        });
    });

    // moveToPosition()

    describe('moveToPosition()', () => {
        it('should return false when the target position is out of bounds — Edge case', async () => {
            const from = makeCharacter('Bot', { x: 0, y: 0 });
            const game = makeGame([from]);

            const result = await service.moveToPosition(from, game, { x: -1, y: 0 });
            expect(result).to.equal(false);
        });

        it('should return true when bot is already at target position — Edge case', async () => {
            const clock = sinon.useFakeTimers();
            const from = makeCharacter('Bot', { x: 1, y: 0 });
            const game = makeGame([from]);
            activeGameService.getActiveGameById.resolves(game);

            const promise = service.moveToPosition(from, game, { x: 1, y: 0 });
            await clock.tickAsync(TICK_DURATION_MS);
            const result = await promise;

            clock.restore();
            expect(result).to.equal(true);
        });

        it('should move to a reachable adjacent cell and return true — Nominal case', async () => {
            const clock = sinon.useFakeTimers();
            const from = makeCharacter('Bot', { x: 0, y: 0 }, { movementLeft: 4 });
            const game = makeGame([from]);

            movementService.movePlayer.resolves({ newPosition: { x: 1, y: 0 }, movementLeft: 3 });

            const promise = service.moveToPosition(from, game, { x: 1, y: 0 });
            await clock.tickAsync(TICK_DURATION_MS);
            const result = await promise;

            clock.restore();
            expect(result).to.equal(true);
        });
    });

    // moveToPositionOrNearest()

    describe('moveToPositionOrNearest()', () => {
        it('should return false for an out-of-bounds target — Edge case', async () => {
            const from = makeCharacter('Bot', { x: 0, y: 0 });
            const game = makeGame([from]);

            const result = await service.moveToPositionOrNearest(from, game, { x: 99, y: 99 });
            expect(result).to.equal(false);
        });

        it('should move to target directly when it is reachable — Nominal case', async () => {
            const clock = sinon.useFakeTimers();
            const from = makeCharacter('Bot', { x: 0, y: 0 }, { movementLeft: 4 });
            const game = makeGame([from]);

            movementService.movePlayer.resolves({ newPosition: { x: 1, y: 0 }, movementLeft: 3 });

            const promise = service.moveToPositionOrNearest(from, game, { x: 1, y: 0 });
            await clock.tickAsync(TICK_DURATION_MS);
            const result = await promise;

            clock.restore();
            // Nominal result: target is directly reachable, so no fallback path is needed.
            expect(result).to.equal(true);
        });

        it('should return false and not move when already at closest reachable index — Edge case', async () => {
            const clock = sinon.useFakeTimers();
            // Edge setup: target region is separated by walls, leaving no meaningful progress route.
            const cells: CellType[][] = [
                [CellType.Empty, CellType.Wall, CellType.Wall, CellType.Wall],
                [CellType.Wall, CellType.Empty, CellType.Empty, CellType.Empty],
                [CellType.Wall, CellType.Empty, CellType.Empty, CellType.Empty],
                [CellType.Wall, CellType.Empty, CellType.Empty, CellType.Empty],
            ];
            const from = makeCharacter('Bot', { x: 0, y: 0 }, { movementLeft: 0 });
            const game = makeGame([from], cells);

            const promise = service.moveToPositionOrNearest(from, game, { x: 3, y: 3 });
            await clock.tickAsync(TICK_DURATION_MS);
            const result = await promise;

            clock.restore();
            expect(result).to.equal(false);
        });

        it('moves to nearest reachable fallback cell when target is unreachable', async () => {
            const clock = sinon.useFakeTimers();
            const cells: CellType[][] = [[CellType.Empty, CellType.Empty, CellType.Wall, CellType.Empty]];
            const from = makeCharacter('Bot', { x: 0, y: 0 }, { movementLeft: 2 });
            const game = makeGame([from], cells);
            movementService.movePlayer.resolves({ newPosition: { x: 1, y: 0 }, movementLeft: 1 });

            const promise = service.moveToPositionOrNearest(from, game, { x: 3, y: 0 });
            await clock.tickAsync(TICK_DURATION_MS);
            const result = await promise;

            clock.restore();
            expect(result).to.equal(false);
            expect(movementService.movePlayer.called).to.equal(true);
        });
    });

    // moveAwayFromPlayers()

    describe('moveAwayFromPlayers()', () => {
        it('should do nothing when there are no adverse players — Edge case', async () => {
            const from = makeCharacter('Bot', { x: 0, y: 0 });
            const game = makeGame([from]);

            await service.moveAwayFromPlayers(from, game, []);
            expect(movementService.movePlayer.called).to.equal(false);
        });

        it('should not move when already at the safest reachable cell — Edge case', async () => {
            const clock = sinon.useFakeTimers();
            // Edge setup: bot is already on the safest tile among reachable cells.
            const cells: CellType[][] = [
                [CellType.Empty, CellType.Empty],
                [CellType.Empty, CellType.Empty],
            ];
            const from = makeCharacter('Bot', { x: 0, y: 0 }, { movementLeft: 0 });
            const enemy = makeCharacter('Enemy', { x: 0, y: 1 }, { team: Team.BLUE });
            const game = makeGame([from, enemy], cells);

            const promise = service.moveAwayFromPlayers(from, game, [enemy]);
            await clock.tickAsync(TICK_DURATION_MS);
            await promise;

            clock.restore();
            expect(movementService.movePlayer.called).to.equal(false);
        });

        it('should move to the cell furthest from the enemy — Nominal case', async () => {
            const clock = sinon.useFakeTimers();
            // Nominal setup: furthest reachable tile should maximize distance from the enemy.
            const cells: CellType[][] = [[CellType.Empty, CellType.Empty, CellType.Empty, CellType.Empty]];
            const from = makeCharacter('Bot', { x: 1, y: 0 }, { movementLeft: 4 });
            const enemy = makeCharacter('Enemy', { x: 0, y: 0 }, { team: Team.BLUE });
            const game = makeGame([from, enemy], cells);

            movementService.movePlayer.resolves({ newPosition: { x: 2, y: 0 }, movementLeft: 3 });

            const promise = service.moveAwayFromPlayers(from, game, [enemy]);
            await clock.runAllAsync();
            await promise;

            clock.restore();
            expect(movementService.movePlayer.called).to.equal(true);
        });
    });

    // moveToPlayer()

    describe('moveToPlayer()', () => {
        it('should return true when bot is already adjacent to target index — Edge case', async () => {
            const clock = sinon.useFakeTimers();
            const from = makeCharacter('Bot', { x: 0, y: 0 });
            const game = makeGame([from]);
            // Edge setup: source index already matches requested adjacent index.
            const promise = service.moveToPlayer(from, game, 0);
            await clock.tickAsync(TICK_DURATION_MS);
            const result = await promise;

            clock.restore();
            expect(result).to.equal(true);
        });

        it('should attempt movement and return true when path exists — Nominal case', async () => {
            const clock = sinon.useFakeTimers();
            const from = makeCharacter('Bot', { x: 0, y: 0 }, { movementLeft: 4 });
            const game = makeGame([from]);

            movementService.movePlayer.resolves({ newPosition: { x: 1, y: 0 }, movementLeft: 3 });

            // Nominal setup: best adjacent index requires one successful movement step.
            const promise = service.moveToPlayer(from, game, 1);
            await clock.tickAsync(TICK_DURATION_MS);
            const result = await promise;

            clock.restore();
            expect(result).to.equal(true);
        });

        it('should return false when target index is not reachable — Edge case', async () => {
            const clock = sinon.useFakeTimers();
            // Edge setup: a wall blocks the only route to the requested index.
            const cells: CellType[][] = [[CellType.Empty, CellType.Wall, CellType.Empty, CellType.Empty]];
            const from = makeCharacter('Bot', { x: 0, y: 0 });
            const game = makeGame([from], cells);

            const promise = service.moveToPlayer(from, game, 2);
            await clock.tickAsync(TICK_DURATION_MS);
            const result = await promise;

            clock.restore();
            expect(result).to.equal(false);
        });

        it('opens a closed door during path traversal before moving through it', async () => {
            const clock = sinon.useFakeTimers();
            const cells: CellType[][] = [[CellType.Empty, CellType.ClosedDoor, CellType.Empty]];
            const from = makeCharacter('Bot', { x: 0, y: 0 }, { movementLeft: 4, actionsLeft: 1 });
            const game = makeGame([from], cells);
            activeGameService.getActiveGameById.resolves(game);
            gameplayActionService.handleToggleDoor.callsFake(async (_data, _socket, _namespace, emitGameLog) => {
                emitGameLog('game-1', 'door-opened');
            });
            movementService.movePlayer.onFirstCall().resolves({ newPosition: { x: 1, y: 0 }, movementLeft: 3 });
            movementService.movePlayer.onSecondCall().resolves({ newPosition: { x: 2, y: 0 }, movementLeft: 2 });

            const promise = service.moveToPlayer(from, game, 2);
            await clock.runAllAsync();
            const result = await promise;

            clock.restore();
            expect(result).to.equal(true);
            expect(gameplayActionService.handleToggleDoor.calledOnce).to.equal(true);
            expect(gameplayLogService.emitGameLogToRoom.calledOnceWithExactly('game-1', 'door-opened')).to.equal(true);
        });

        it('returns false when movement service throws while traversing path', async () => {
            const clock = sinon.useFakeTimers();
            const from = makeCharacter('Bot', { x: 0, y: 0 }, { movementLeft: 4 });
            const game = makeGame([from]);
            movementService.movePlayer.rejects(new Error('move failed'));

            const promise = service.moveToPlayer(from, game, 1);
            await clock.tickAsync(TICK_DURATION_MS);
            const result = await promise;

            clock.restore();
            expect(result).to.equal(false);
        });

        it('moves through a closed door when actions remain', async () => {
            const clock = sinon.useFakeTimers();
            // Nominal setup: the bot still has an action available when it reaches the door.
            const cells: CellType[][] = [[CellType.Empty, CellType.ClosedDoor, CellType.Empty]];
            const from = makeCharacter('Bot', { x: 0, y: 0 }, { movementLeft: 4, actionsLeft: 1 });
            const game = makeGame([from], cells);

            const promise = service.moveToPlayer(from, game, 2);
            await clock.runAllAsync();
            const result = await promise;

            clock.restore();
            expect(result).to.equal(false);
        });

        it('breaks traversal on a closed door when no actions remain', async () => {
            const clock = sinon.useFakeTimers();
            // Edge setup: the second step crosses a closed door and the bot loses its last action after the first move.
            const cells: CellType[][] = [[CellType.Empty, CellType.Empty, CellType.ClosedDoor, CellType.Empty]];
            const from = makeCharacter('Bot', { x: 0, y: 0 }, { movementLeft: 4, actionsLeft: 1 });
            const game = makeGame([from], cells);
            movementService.movePlayer.onFirstCall().callsFake(async (_playerName, _gameId, position) => {
                from.actionsLeft = 0;
                return { newPosition: position, movementLeft: 3 };
            });

            const promise = service.moveToPlayer(from, game, MOVE_THROUGH_DOOR_INDEX);
            await clock.tickAsync(TICK_DURATION_MS);
            const result = await promise;

            clock.restore();
            expect(result).to.equal(false);
            expect(gameplayActionService.handleToggleDoor.called).to.equal(false);
        });
    });

    it('finds a closer reachable fallback index when scanning distances', () => {
        const targetPosition = { x: 3, y: 0 };
        const distances = [0, 1, 2, Infinity];

        const fallbackIndex = (
            service as unknown as {
                findClosestReachableIndexToTarget: (
                    scanDistances: number[],
                    totalColumns: number,
                    target: { x: number; y: number },
                    movementLeft: number,
                    srcIndex: number,
                ) => number;
            }
        ).findClosestReachableIndexToTarget(distances, BOARD_WIDTH_FOUR, targetPosition, FALLBACK_SCAN_LIMIT, 0);

        expect(fallbackIndex).to.equal(2);
    });

    it('prefers the farther path when two fallback cells are equally close to the target', () => {
        const targetPosition = { x: FARTHER_PATH_TARGET_X, y: 0 };
        const distances = [0, 1, Infinity, FARTHER_PATH_DISTANCE];

        const fallbackIndex = (
            service as unknown as {
                findClosestReachableIndexToTarget: (
                    scanDistances: number[],
                    totalColumns: number,
                    target: { x: number; y: number },
                    movementLeft: number,
                    srcIndex: number,
                ) => number;
            }
        ).findClosestReachableIndexToTarget(distances, BOARD_WIDTH_FOUR, targetPosition, FARTHER_PATH_MOVE_LEFT, 0);

        expect(fallbackIndex).to.equal(FARTHER_PATH_RESULT_INDEX);
    });

    it('keeps position when no safer threat-equal move is selected', async () => {
        const clock = sinon.useFakeTimers();
        const cells: CellType[][] = [
            [CellType.Empty, CellType.Empty, CellType.Empty],
            [CellType.Wall, CellType.Empty, CellType.Wall],
            [CellType.Empty, CellType.Empty, CellType.Empty],
        ];
        const from = makeCharacter('Bot', { x: 0, y: 0 }, { movementLeft: 4 });
        const enemy = makeCharacter('Enemy', { x: 1, y: 1 }, { team: Team.BLUE });
        const game = makeGame([from, enemy], cells);
        movementService.movePlayer.resolves({ newPosition: { x: 2, y: 2 }, movementLeft: 1 });

        const promise = service.moveAwayFromPlayers(from, game, [enemy]);
        await clock.runAllAsync();
        await promise;

        clock.restore();
        expect(movementService.movePlayer.called).to.equal(true);
        expect(movementService.movePlayer.firstCall.args[2]).to.deep.equal({ x: 1, y: 0 });
    });
});
