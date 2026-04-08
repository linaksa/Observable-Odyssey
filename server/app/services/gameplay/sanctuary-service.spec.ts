import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { SANCTUARY_COOLDOWN_TURN_STEPS } from '@app/services/gameplay/sanctuary-helpers';
import { SanctuaryService } from '@app/services/gameplay/sanctuary-service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { ItemType } from '@common/items';
import { expect } from 'chai';
import * as sinon from 'sinon';

const SANCTUARY_X = 1;
const SANCTUARY_Y = 1;
const ADJACENT_X = 0;
const ADJACENT_Y = 1;
const DAMAGED_HEALTH = 4;
const FULL_HEALTH = 6;
const BASE_STAT = 4;
const DOUBLE_RANDOM_FAILURE = 0.75;

describe('SanctuaryService', () => {
    let sanctuaryService: SanctuaryService;
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
        saveActiveGameById: sinon.SinonStub;
    };

    beforeEach(() => {
        activeGameService = {
            getActiveGameById: sinon.stub(),
            saveActiveGameById: sinon.stub().resolves(),
        };

        sanctuaryService = new SanctuaryService(activeGameService as unknown as ActiveGameService);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should heal the player with a standard life sanctuary interaction', async () => {
        const activeGame = createActiveGame(ItemType.LifeSanctuary);
        activeGame.players[0].currentPosition = { x: ADJACENT_X, y: ADJACENT_Y };
        activeGame.players[0].currentHealth = DAMAGED_HEALTH;
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await sanctuaryService.interactSanctuary('Alice', activeGame._id, {
            position: { x: SANCTUARY_X, y: SANCTUARY_Y },
            choice: 'standard',
        });

        expect(result.succeeded).to.equal(true);
        expect(result.currentHealth).to.equal(FULL_HEALTH);
        expect(activeGame.players[0].currentHealth).to.equal(FULL_HEALTH);
        expect(activeGame.players[0].actionsLeft).to.equal(0);
        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
    });

    it('should deactivate the sanctuary and expose its cooldown after use', async () => {
        const activeGame = createActiveGame(ItemType.LifeSanctuary);
        activeGame.players[0].currentPosition = { x: ADJACENT_X, y: ADJACENT_Y };
        activeGame.players[0].currentHealth = DAMAGED_HEALTH;
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await sanctuaryService.interactSanctuary('Alice', activeGame._id, {
            position: { x: SANCTUARY_X, y: SANCTUARY_Y },
            choice: 'standard',
        });

        const sanctuary = activeGame.game.board.items[0];

        expect(result.sanctuaryActive).to.equal(false);
        expect(result.sanctuaryInactiveTurnsRemaining).to.equal(SANCTUARY_COOLDOWN_TURN_STEPS);
        expect(sanctuary.active).to.equal(false);
        expect(sanctuary.inactiveTurnsRemaining).to.equal(SANCTUARY_COOLDOWN_TURN_STEPS);
    });

    it('should fail a double life sanctuary gamble without healing', async () => {
        const activeGame = createActiveGame(ItemType.LifeSanctuary);
        activeGame.players[0].currentPosition = { x: ADJACENT_X, y: ADJACENT_Y };
        activeGame.players[0].currentHealth = DAMAGED_HEALTH;
        activeGameService.getActiveGameById.resolves(activeGame);
        const randomStub = sinon.stub(Math, 'random').returns(DOUBLE_RANDOM_FAILURE);

        const result = await sanctuaryService.interactSanctuary('Alice', activeGame._id, {
            position: { x: SANCTUARY_X, y: SANCTUARY_Y },
            choice: 'double',
        });

        expect(result.succeeded).to.equal(false);
        expect(result.currentHealth).to.equal(DAMAGED_HEALTH);
        expect(activeGame.players[0].currentHealth).to.equal(DAMAGED_HEALTH);
        expect(activeGame.players[0].actionsLeft).to.equal(0);
        expect(randomStub.calledOnce).to.equal(true);
    });

    it('should consume the once-only fight sanctuary use even when the double gamble fails', async () => {
        const activeGame = createActiveGame(ItemType.FightSanctuary);
        activeGame.players[0].currentPosition = { x: ADJACENT_X, y: ADJACENT_Y };
        activeGameService.getActiveGameById.resolves(activeGame);
        const randomStub = sinon.stub(Math, 'random').returns(DOUBLE_RANDOM_FAILURE);

        const result = await sanctuaryService.interactSanctuary('Alice', activeGame._id, {
            position: { x: SANCTUARY_X, y: SANCTUARY_Y },
            choice: 'double',
        });

        expect(result.succeeded).to.equal(false);
        expect(result.actionsLeft).to.equal(0);
        expect(result.attackPoints).to.equal(BASE_STAT);
        expect(result.defensePoints).to.equal(BASE_STAT);
        expect(result.fightSanctuaryUsed).to.equal(true);
        expect(result.fightSanctuaryTurnsRemaining).to.equal(0);
        expect(result.fightSanctuaryBonus).to.equal(0);
        expect(activeGame.players[0].fightSanctuaryUsed).to.equal(true);
        expect(activeGame.players[0].fightSanctuaryTurnsRemaining).to.equal(0);
        expect(activeGame.players[0].fightSanctuaryBonus).to.equal(0);
        expect(randomStub.calledOnce).to.equal(true);

        activeGame.game.board.items[0].active = true;
        activeGame.game.board.items[0].inactiveTurnsRemaining = 0;
        activeGame.players[0].actionsLeft = 1;

        try {
            await sanctuaryService.interactSanctuary('Alice', activeGame._id, {
                position: { x: SANCTUARY_X, y: SANCTUARY_Y },
                choice: 'standard',
            });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.contain('déjà utilisé');
        }
    });
});

function createActiveGame(itemType: ItemType): IActiveGame {
    return {
        _id: 'active-game-1',
        game: {
            gameTitle: 'Sanctuary game',
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
                items: [createSanctuary(SANCTUARY_X, SANCTUARY_Y, itemType)],
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

function createCharacter(name: string) {
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
        currentPosition: { x: 0, y: 0 },
        fightSanctuaryUsed: false,
        fightSanctuaryTurnsRemaining: 0,
        fightSanctuaryBonus: 0,

        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [] as string[],
    };
}

function createSanctuary(x: number, y: number, itemType: ItemType) {
    return {
        itemType,
        x,
        y,
        size: 4,
    };
}
