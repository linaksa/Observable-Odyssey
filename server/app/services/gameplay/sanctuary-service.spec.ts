import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { SanctuaryService } from '@app/services/gameplay/sanctuary-service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { Avatar, DiceType, SANCTUARY_COOLDOWN_TURN_STEPS } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { SanctuaryChoice } from '@common/info';
import { ItemType } from '@common/items';
import { expect } from 'chai';
import * as sinon from 'sinon';

const SANCTUARY_X = 1;
const SANCTUARY_Y = 1;
const ADJACENT_X = 0;
const ADJACENT_Y = 1;
const DAMAGED_HEALTH = 4;
const FULL_HEALTH = 6;
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
            choice: SanctuaryChoice.Standard,
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
            choice: SanctuaryChoice.Standard,
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
            choice: SanctuaryChoice.Double,
        });

        expect(result.succeeded).to.equal(false);
        expect(result.currentHealth).to.equal(DAMAGED_HEALTH);
        expect(activeGame.players[0].currentHealth).to.equal(DAMAGED_HEALTH);
        expect(activeGame.players[0].actionsLeft).to.equal(0);
        expect(randomStub.calledOnce).to.equal(true);
    });

    it('should keep fight sanctuary disabled after use', async () => {
        const activeGame = createActiveGame(ItemType.FightSanctuary);
        activeGame.players[0].currentPosition = { x: ADJACENT_X, y: ADJACENT_Y };
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await sanctuaryService.interactSanctuary('Alice', activeGame._id, {
            position: { x: SANCTUARY_X, y: SANCTUARY_Y },
            choice: SanctuaryChoice.Standard,
        });

        expect(result.succeeded).to.equal(true);
        expect(result.fightSanctuaryUsed).to.equal(true);
        expect(result.fightSanctuaryTurnsRemaining).to.equal(2);
        expect(result.fightSanctuaryBonus).to.equal(1);
        expect(activeGame.players[0].fightSanctuaryUsed).to.equal(true);
        expect(activeGame.players[0].fightSanctuaryTurnsRemaining).to.equal(2);
        expect(activeGame.players[0].fightSanctuaryBonus).to.equal(1);

        sanctuaryService.onTurnEnded(activeGame, 'Alice');
        sanctuaryService.onTurnEnded(activeGame, 'Alice');

        expect(activeGame.players[0].fightSanctuaryUsed).to.equal(false);
        expect(activeGame.players[0].fightSanctuaryTurnsRemaining).to.equal(0);
        expect(activeGame.players[0].fightSanctuaryBonus).to.equal(0);

        activeGame.players[0].actionsLeft = 1;

        try {
            await sanctuaryService.interactSanctuary('Alice', activeGame._id, {
                position: { x: SANCTUARY_X, y: SANCTUARY_Y },
                choice: SanctuaryChoice.Standard,
            });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.contain('déjà été utilisé');
        }
    });

    it('should block fight sanctuary reuse while the buff is still active', async () => {
        const activeGame = createActiveGame(ItemType.FightSanctuary);
        activeGame.players[0].currentPosition = { x: ADJACENT_X, y: ADJACENT_Y };
        activeGameService.getActiveGameById.resolves(activeGame);

        await sanctuaryService.interactSanctuary('Alice', activeGame._id, {
            position: { x: SANCTUARY_X, y: SANCTUARY_Y },
            choice: SanctuaryChoice.Standard,
        });

        activeGame.game.board.items[0].active = true;
        activeGame.game.board.items[0].inactiveTurnsRemaining = 0;
        activeGame.players[0].actionsLeft = 1;

        try {
            await sanctuaryService.interactSanctuary('Alice', activeGame._id, {
                position: { x: SANCTUARY_X, y: SANCTUARY_Y },
                choice: SanctuaryChoice.Standard,
            });
            throw new Error('Should have thrown');
        } catch (error) {
            expect((error as Error).message).to.contain('buff de combat actif');
        }
    });

    it('should allow a second player to receive a fight buff once sanctuary cooldown ends', async () => {
        const activeGame = createActiveGame(ItemType.FightSanctuary);
        activeGame.players[0].currentPosition = { x: ADJACENT_X, y: ADJACENT_Y };
        const secondPlayer = createCharacter('Bob');
        secondPlayer.currentPosition = { x: SANCTUARY_X, y: SANCTUARY_Y - 1 };
        activeGame.players.push(secondPlayer);
        activeGame.turnOrder = ['Alice', 'Bob'];
        activeGame.currentPlayerIndex = 0;
        activeGameService.getActiveGameById.resolves(activeGame);

        const firstResult = await sanctuaryService.interactSanctuary('Alice', activeGame._id, {
            position: { x: SANCTUARY_X, y: SANCTUARY_Y },
            choice: SanctuaryChoice.Standard,
        });

        expect(firstResult.succeeded).to.equal(true);
        expect(activeGame.game.board.items[0].active).to.equal(false);
        expect(activeGame.game.board.items[0].inactiveTurnsRemaining).to.equal(SANCTUARY_COOLDOWN_TURN_STEPS);

        // Turn 1 after use (Bob starts)
        sanctuaryService.onTurnStarted(activeGame);
        expect(activeGame.game.board.items[0].active).to.equal(false);
        expect(activeGame.game.board.items[0].inactiveTurnsRemaining).to.equal(SANCTUARY_COOLDOWN_TURN_STEPS - 1);

        // Turn 2 after use (Alice starts)
        sanctuaryService.onTurnStarted(activeGame);
        expect(activeGame.game.board.items[0].active).to.equal(false);
        expect(activeGame.game.board.items[0].inactiveTurnsRemaining).to.equal(1);

        // Turn 3 after use (Bob starts again) => sanctuary available
        sanctuaryService.onTurnStarted(activeGame);

        expect(activeGame.game.board.items[0].active).to.equal(true);
        expect(activeGame.game.board.items[0].inactiveTurnsRemaining).to.equal(0);

        activeGame.currentPlayerIndex = 1;
        activeGame.players[1].actionsLeft = 1;

        const secondResult = await sanctuaryService.interactSanctuary('Bob', activeGame._id, {
            position: { x: SANCTUARY_X, y: SANCTUARY_Y },
            choice: SanctuaryChoice.Standard,
        });

        expect(secondResult.succeeded).to.equal(true);
        expect(secondResult.fightSanctuaryUsed).to.equal(true);
        expect(secondResult.fightSanctuaryBonus).to.equal(1);
        expect(secondResult.fightSanctuaryTurnsRemaining).to.equal(2);
        expect(secondResult.actionsLeft).to.equal(0);
        expect(secondResult.sanctuaryActive).to.equal(false);
        expect(secondResult.sanctuaryInactiveTurnsRemaining).to.equal(SANCTUARY_COOLDOWN_TURN_STEPS);
        expect(activeGame.players[1].fightSanctuaryUsed).to.equal(true);
        expect(activeGame.players[1].fightSanctuaryBonus).to.equal(1);
        expect(activeGame.players[1].fightSanctuaryTurnsRemaining).to.equal(2);
        expect(activeGame.game.board.items[0].active).to.equal(false);
        expect(activeGame.game.board.items[0].inactiveTurnsRemaining).to.equal(SANCTUARY_COOLDOWN_TURN_STEPS);
    });

    it('should allow using a sanctuary when it is active even if a stale cooldown counter remains', async () => {
        const activeGame = createActiveGame(ItemType.FightSanctuary);
        activeGame.players[0].currentPosition = { x: ADJACENT_X, y: ADJACENT_Y };
        activeGame.game.board.items[0].active = true;
        activeGame.game.board.items[0].inactiveTurnsRemaining = 1;
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await sanctuaryService.interactSanctuary('Alice', activeGame._id, {
            position: { x: SANCTUARY_X, y: SANCTUARY_Y },
            choice: SanctuaryChoice.Standard,
        });

        expect(result.succeeded).to.equal(true);
        expect(result.actionsLeft).to.equal(0);
        expect(result.sanctuaryActive).to.equal(false);
        expect(result.sanctuaryInactiveTurnsRemaining).to.equal(SANCTUARY_COOLDOWN_TURN_STEPS);
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
