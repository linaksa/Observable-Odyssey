/**
 * Testing strategy — GlobalStatsService
 *
 * Approach:
 * - Build deterministic active-game fixtures and assert each aggregate counter helper independently.
 * - Validate visited-terrain parsing from serialized coordinate paths used in action stats.
 *
 * Edge cases covered:
 * - Duplicate or malformed visited coordinates are ignored safely.
 * - Out-of-bounds and non-terrain cells never increase terrain visit totals.
 */
import { GlobalStatsService } from '@app/services/end/global-stats.service';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { IItem, ItemType } from '@common/items';

const THREE = 3;
const SANCTUARY_ITEM_SIZE = 4;

describe('GlobalStatsService', () => {
    let service: GlobalStatsService;

    beforeEach(() => {
        service = new GlobalStatsService();
    });

    it('counts only life/fight sanctuaries', () => {
        // Nominal case
        const activeGame = createActiveGame({
            items: [createItem(ItemType.LifeSanctuary, 0, 0), createItem(ItemType.FightSanctuary, 2, 2), createItem(ItemType.Flag, 1, 1)],
        });

        expect(service.getTotalSanctuaryCount(activeGame)).toBe(2);
    });

    it('counts only open and closed doors', () => {
        // Nominal case
        const activeGame = createActiveGame({
            cells: [
                [CellType.OpenDoor, CellType.ClosedDoor],
                [CellType.Empty, CellType.Wall],
            ],
        });

        expect(service.getTotalDoorCount(activeGame)).toBe(2);
    });

    it('counts only terrain tiles (empty/ice/water)', () => {
        // Nominal case
        const activeGame = createActiveGame({
            cells: [
                [CellType.Empty, CellType.Ice],
                [CellType.Water, CellType.Wall],
            ],
        });

        expect(service.getTotalTerrainTileCount(activeGame)).toBe(THREE);
    });

    it('counts unique visited terrain tiles while ignoring invalid entries', () => {
        // Edge case
        const activeGame = createActiveGame({
            cells: [
                [CellType.Empty, CellType.Wall, CellType.Water],
                [CellType.Ice, CellType.ClosedDoor, CellType.Empty],
            ],
            players: [
                createPlayer('Alice', ['0,0', '0,0', '2,0', '1,1', 'bad', '2,9']),
                createPlayer('Bob', ['0,1', '2,0', undefined as unknown as string]),
                createPlayerWithUndefinedVisitedCells('Carol'),
            ],
        });

        expect(service.getVisitedTerrainTileCount(activeGame)).toBe(THREE);
    });

    function createItem(itemType: ItemType, x: number, y: number): IItem {
        return {
            itemType,
            x,
            y,
            size: itemType === ItemType.Flag || itemType === ItemType.StartingPosition ? 1 : SANCTUARY_ITEM_SIZE,
            active: true,
        };
    }

    function createPlayer(name: string, visitedCells: string[] | undefined): ICharacter {
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
            movementLeft: 3,
            victories: 0,
            hasAbandoned: false,
            startingPosition: { x: 0, y: 0 },
            currentPosition: { x: 0, y: 0 },
            nCombats: 0,
            nVictories: 0,
            nDefeats: 0,
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            visitedCells: visitedCells ?? [],
        };
    }

    function createPlayerWithUndefinedVisitedCells(name: string): ICharacter {
        return {
            ...createPlayer(name, []),
            visitedCells: undefined as unknown as string[],
        };
    }

    function createActiveGame(overrides: { cells?: CellType[][]; items?: IItem[]; players?: ICharacter[] }): IActiveGame {
        const cells = overrides.cells ?? [[CellType.Empty]];
        const players = overrides.players ?? [createPlayer('Alice', [])];
        return {
            _id: 'game-1',
            game: {
                gameTitle: 'Game',
                description: 'Desc',
                gameMode: GameType.Classic,
                lastModifiedDate: new Date(),
                dateCreated: new Date(),
                visibility: Visibility.Viewable,
                board: {
                    cells,
                    items: overrides.items ?? [],
                },
            },
            players,
            currentPlayerIndex: 0,
            turnOrder: players.map((player) => player.name),
            isFinished: false,
            winner: null,
            messages: [],
            isDebugMode: false,
            organizerName: players[0]?.name ?? 'Alice',
            maxPlayerCount: 4,
            turnIsInPreparation: false,
            hasFlagId: null,
            turnStartTimeStamp: Date.now(),
            currentAttack: null,
        };
    }
});
