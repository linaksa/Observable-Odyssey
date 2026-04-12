import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { ItemType } from '@common/items';
import { expect } from 'chai';

describe('PositionValidatorService', () => {
    let service: PositionValidatorService;

    beforeEach(() => {
        service = new PositionValidatorService();
    });

    it('should block sanctuary cells while keeping regular walkable tiles open', () => {
        const activeGame = createActiveGame();

        expect(service.isWalkable({ x: 0, y: 0 }, activeGame)).to.equal(true);
        expect(service.isWalkable({ x: 1, y: 1 }, activeGame)).to.equal(false);
        expect(service.isWalkable({ x: 2, y: 2 }, activeGame)).to.equal(false);
    });

    it('should reject respawn tiles that are occupied or blocked', () => {
        const activeGame = createActiveGame();

        expect(service.isValidRespawnTile({ x: 0, y: 0 }, activeGame)).to.equal(false);
        expect(service.isValidRespawnTile({ x: 1, y: 1 }, activeGame)).to.equal(false);
        expect(service.isValidRespawnTile({ x: 2, y: 2 }, activeGame)).to.equal(false);
    });

    it('should ignore abandoned players when checking occupancy', () => {
        const activeGame = createActiveGame();
        activeGame.players.push({
            ...activeGame.players[0],
            name: 'Bob',
            hasAbandoned: true,
            currentPosition: { x: 2, y: 2 },
            startingPosition: { x: 2, y: 2 },
        });

        expect(service.isOccupiedByPlayer({ x: 2, y: 2 }, activeGame)).to.equal(false);
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
                items: [createSanctuary(1, 1)],
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
