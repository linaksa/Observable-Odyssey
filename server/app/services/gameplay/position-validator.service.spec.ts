/**
 * Testing strategy — PositionValidatorService
 *
 * Approach:
 * - Validate all public predicates and flag-drop helpers with compact board fixtures.
 * - Exercise adjacency, walkability, occupancy, spawn checks, bounds, and BFS-based drop-position search.
 *
 * Edge cases covered:
 * - Out-of-bounds/undefined tiles, sanctuary footprints, blocked terrain, and abandoned-player occupancy handling.
 * - Open-door redirection for flag drops plus fallback behavior when no alternative drop tile exists.
 */
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { ItemType } from '@common/items';
import { expect } from 'chai';
import * as sinon from 'sinon';

describe('PositionValidatorService', () => {
    let service: PositionValidatorService;

    beforeEach(() => {
        service = new PositionValidatorService();
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should validate adjacency only on cardinal neighboring cells', () => {
        // Nominal case: horizontal and vertical neighbors are adjacent.
        expect(service.isAdjacent({ x: 0, y: 0 }, { x: 1, y: 0 })).to.equal(true);
        expect(service.isAdjacent({ x: 0, y: 0 }, { x: 0, y: 1 })).to.equal(true);

        // Edge case: diagonal and same-position checks are rejected.
        expect(service.isAdjacent({ x: 0, y: 0 }, { x: 1, y: 1 })).to.equal(false);
        expect(service.isAdjacent({ x: 0, y: 0 }, { x: 0, y: 0 })).to.equal(false);
    });

    it('should block out-of-bounds, undefined, and sanctuary-covered walk targets', () => {
        const activeGame = createActiveGame();
        activeGame.game.board.cells[1][2] = undefined as never;

        // Edge case: out of bounds.
        expect(service.isWalkable({ x: -1, y: 0 }, activeGame)).to.equal(false);
        expect(service.isWalkable({ x: 0, y: -1 }, activeGame)).to.equal(false);

        // Edge case: undefined tile value.
        expect(service.isWalkable({ x: 2, y: 1 }, activeGame)).to.equal(false);

        // Edge case: sanctuary footprint blocks movement.
        expect(service.isWalkable({ x: 1, y: 1 }, activeGame)).to.equal(false);
        expect(service.isWalkable({ x: 2, y: 2 }, activeGame)).to.equal(false);
    });

    it('should treat missing board items metadata as an empty list for walkability checks', () => {
        const activeGame = createActiveGame();
        activeGame.game.board.items = undefined as never;

        // Edge case: nullish board items fall back to an empty list.
        expect(service.isWalkable({ x: 1, y: 1 }, activeGame)).to.equal(true);
    });

    it('should treat wall and closed doors as non-walkable cells', () => {
        // Nominal case: empty/open door are walkable.
        expect(service.isWalkableCell(CellType.Empty)).to.equal(true);
        expect(service.isWalkableCell(CellType.OpenDoor)).to.equal(true);

        // Edge case: blocked terrain and undefined are not walkable.
        expect(service.isWalkableCell(CellType.Wall)).to.equal(false);
        expect(service.isWalkableCell(CellType.ClosedDoor)).to.equal(false);
        expect(service.isWalkableCell(undefined as never)).to.equal(false);
    });

    it('should detect occupancy while ignoring abandoned players', () => {
        const activeGame = createActiveGame();
        activeGame.players.push({
            ...activeGame.players[0],
            name: 'Bob',
            hasAbandoned: true,
            currentPosition: { x: 2, y: 2 },
            startingPosition: { x: 2, y: 2 },
        });

        expect(service.isOccupiedByPlayer({ x: 0, y: 0 }, activeGame)).to.equal(true);
        expect(service.isOccupiedByPlayer({ x: 2, y: 2 }, activeGame)).to.equal(false);
    });

    it('should validate respawn tiles only when walkable and unoccupied', () => {
        const activeGame = createActiveGame();

        expect(service.isValidRespawnTile({ x: 0, y: 0 }, activeGame)).to.equal(false);
        expect(service.isValidRespawnTile({ x: 1, y: 1 }, activeGame)).to.equal(false);
        expect(service.isValidRespawnTile({ x: 0, y: 2 }, activeGame)).to.equal(true);
    });

    it('should resolve bounds and open-door checks consistently', () => {
        const activeGame = createActiveGame();
        activeGame.game.board.cells[0][1] = CellType.OpenDoor;
        activeGame.game.board.cells[2][2] = CellType.ClosedDoor;

        expect(service.isWithinBounds({ x: 1, y: 0 }, activeGame)).to.equal(true);
        expect(service.isWithinBounds({ x: 3, y: 0 }, activeGame)).to.equal(false);
        expect(service.isOpenDoorTile({ x: 1, y: 0 }, activeGame)).to.equal(true);
        expect(service.isOpenDoorTile({ x: 2, y: 2 }, activeGame)).to.equal(false);
        expect(service.isOpenDoorTile({ x: 3, y: 0 }, activeGame)).to.equal(false);
    });

    it('should identify starting points and distinguish other players start tiles', () => {
        const activeGame = createActiveGame();
        const carrierStart = { x: 0, y: 2 };

        expect(service.isStartingPoint({ x: 0, y: 2 }, activeGame)).to.equal(true);
        expect(service.isStartingPoint({ x: 2, y: 0 }, activeGame)).to.equal(false);
        expect(service.isOtherPlayerStartingPoint({ x: 0, y: 2 }, carrierStart, activeGame)).to.equal(false);
        expect(service.isOtherPlayerStartingPoint({ x: 2, y: 2 }, carrierStart, activeGame)).to.equal(true);
    });

    it('should validate flag drop tiles by combining terrain, occupancy, and spawn checks', () => {
        const activeGame = createActiveGame();
        activeGame.game.board.cells[0][1] = CellType.OpenDoor;

        expect(service.isValidFlagDropTile({ x: 0, y: 2 }, activeGame)).to.equal(false); // starting point
        expect(service.isValidFlagDropTile({ x: 0, y: 0 }, activeGame)).to.equal(false); // occupied
        expect(service.isValidFlagDropTile({ x: 1, y: 0 }, activeGame)).to.equal(true); // open door is walkable and not spawn
    });

    it('should find the closest open flag drop position away from the origin', () => {
        const activeGame = createActiveGame();
        activeGame.game.board.cells = [
            [CellType.Wall, CellType.Wall, CellType.Wall],
            [CellType.Wall, CellType.OpenDoor, CellType.Empty],
            [CellType.Wall, CellType.Empty, CellType.Empty],
        ];
        activeGame.game.board.items = [
            { itemType: ItemType.StartingPosition, x: 0, y: 2, size: 1 },
            { itemType: ItemType.StartingPosition, x: 2, y: 2, size: 1 },
        ];

        // Nominal case: BFS skips origin and returns nearest valid terrain tile.
        expect(service.findClosestOpenFlagDropPosition({ x: 1, y: 1 }, activeGame)).to.deep.equal({ x: 1, y: 2 });

        // Edge case: no candidate tile found.
        activeGame.game.board.cells = [
            [CellType.Wall, CellType.Wall, CellType.Wall],
            [CellType.Wall, CellType.OpenDoor, CellType.Wall],
            [CellType.Wall, CellType.Wall, CellType.Wall],
        ];
        expect(service.findClosestOpenFlagDropPosition({ x: 1, y: 1 }, activeGame)).to.equal(null);
    });

    it('should continue BFS safely when a dequeued node is undefined', () => {
        const activeGame = createActiveGame();
        const originalShift = Array.prototype.shift;
        let injectedUndefined = false;

        const shiftStub = sinon.stub(Array.prototype, 'shift').callsFake(function <T>(this: T[]): T | undefined {
            if (!injectedUndefined && this.length > 0 && typeof (this[0] as { x?: unknown })?.x === 'number') {
                injectedUndefined = true;
                originalShift.call(this);
                return undefined;
            }

            return originalShift.call(this);
        });

        // Edge case: undefined queue entries are ignored without crashing.
        expect(service.findClosestOpenFlagDropPosition({ x: 1, y: 1 }, activeGame)).to.equal(null);
        expect(shiftStub.called).to.equal(true);
    });

    it('should resolve flag drop position with redirection and fallback branches', () => {
        const activeGame = createActiveGame();
        const desired = { x: 1, y: 0 };
        const carrierStart = { x: 0, y: 2 };
        activeGame.game.board.cells[0][1] = CellType.OpenDoor;

        // Nominal case: open door triggers nearest open drop search.
        const findClosestStub = sinon.stub(service, 'findClosestOpenFlagDropPosition').returns({ x: 2, y: 0 });
        expect(service.resolveFlagDropPosition(desired, carrierStart, activeGame)).to.deep.equal({ x: 2, y: 0 });

        // Edge case: fallback keeps desired position when no alternative exists.
        findClosestStub.returns(null);
        expect(service.resolveFlagDropPosition(desired, carrierStart, activeGame)).to.deep.equal(desired);

        // Nominal case: regular terrain keeps desired position without redirect.
        expect(service.resolveFlagDropPosition({ x: 0, y: 1 }, carrierStart, activeGame)).to.deep.equal({ x: 0, y: 1 });
        expect(findClosestStub.callCount).to.equal(2);
    });

    it('should reject terrain checks outside board bounds', () => {
        const activeGame = createActiveGame();
        const privateService = service as unknown as {
            isTerrainTile: (position: { x: number; y: number }, game: IActiveGame) => boolean;
        };

        // Edge case: out-of-bounds cells are never considered terrain.
        expect(privateService.isTerrainTile({ x: -1, y: 0 }, activeGame)).to.equal(false);
    });
});

function createActiveGame(): IActiveGame {
    return {
        _id: 'active-game-1',
        game: {
            gameTitle: 'Validation game',
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
                items: [createSanctuary(1, 1), createStartingPosition(0, 2), createStartingPosition(2, 2)],
            },
        },
        players: [
            {
                name: 'Alice',
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
                startingPosition: { x: 0, y: 0 },
                currentPosition: { x: 0, y: 0 },

                nCombats: 0,
                nVictories: 0,
                nDefeats: 0,
                totalDamageDealt: 0,
                totalDamageReceived: 0,
                visitedCells: [] as string[],
            },
        ],
        currentPlayerIndex: 0,
        turnOrder: ['Alice'],
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Alice',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        turnStartTimeStamp: 0,
        currentAttack: null,
        hasFlagId: '',
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

function createStartingPosition(x: number, y: number) {
    return {
        itemType: ItemType.StartingPosition,
        x,
        y,
        size: 1,
    };
}
