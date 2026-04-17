/**
 * Testing strategy — ActionService
 *
 * Approach:
 * - Exercise team checks, flag interactions, combat precondition gates, sanctuary-action eligibility, and combat delegation wrappers with stubbed dependencies.
 * - Keep each branch deterministic by controlling active-game snapshots and adjacency responses explicitly.
 *
 * Edge cases covered:
 * - Missing game/player branches, self-targeting, abandoned defenders, wrong-turn usage, zero-action state, and adjacency failures.
 * - Sanctuary availability checks for missing game/player and no-actions paths.
 * - Combat resolution wrapper failure when the active game is absent.
 * - Flag handoff history updates when a new holder receives the flag for the first time.
 */
import { ActionService } from '@app/services/gameplay/action-service';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter, Team } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { ErrorCode } from '@common/error-codes';
import { GameType, Visibility } from '@common/game';
import { ItemType, SMALL_ITEM_SIZE } from '@common/items';
import { expect } from 'chai';
import { StatusCodes } from 'http-status-codes';
import * as sinon from 'sinon';

describe('ActionService', () => {
    let actionService: ActionService;
    let combatService: {
        resolveCombat: sinon.SinonStub;
        applyCombatTurn: sinon.SinonStub;
        autoChooseVirtualPostures: sinon.SinonStub;
        combatTurnCanBeApplied: sinon.SinonStub;
    };
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
        saveActiveGameById: sinon.SinonStub;
    };
    let positionValidatorService: {
        isAdjacent: sinon.SinonStub;
    };

    beforeEach(() => {
        combatService = {
            resolveCombat: sinon.stub(),
            applyCombatTurn: sinon.stub(),
            autoChooseVirtualPostures: sinon.stub(),
            combatTurnCanBeApplied: sinon.stub(),
        };
        activeGameService = {
            getActiveGameById: sinon.stub(),
            saveActiveGameById: sinon.stub().resolves(),
        };
        positionValidatorService = {
            isAdjacent: sinon.stub(),
        };
        actionService = new ActionService(combatService as never, activeGameService as never, positionValidatorService as never);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should return whether two players are on the same team', async () => {
        // Nominal case: both players exist and share the same team.
        const activeGame = createActiveGame();
        activeGame.players[0].team = Team.RED;
        activeGame.players[1].team = Team.RED;
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await actionService.isOnSameTeam('Alice', 'Bob', activeGame._id);

        expect(result).to.equal(true);
    });

    it('should throw PlayerNotFound when one player is missing while checking teams', async () => {
        // Edge case: target player does not exist in the active game.
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);

        try {
            await actionService.isOnSameTeam('Alice', 'Missing', activeGame._id);
            throw new Error('Expected PlayerNotFound error');
        } catch (error) {
            expect((error as { status: number }).status).to.equal(StatusCodes.NOT_FOUND);
            expect((error as { errorCodes: ErrorCode[] }).errorCodes).to.deep.equal([ErrorCode.PlayerNotFound]);
        }
    });

    it('should support take and give flag checks and updates', async () => {
        // Nominal case: flag ownership and holder history are updated and persisted.
        const activeGame = createActiveGame();
        activeGame.hasFlagId = 'Bob';
        activeGame.flagHolderHistory = ['Bob'];
        activeGameService.getActiveGameById.resolves(activeGame);

        expect(await actionService.canTakeFlag('Bob', activeGame._id)).to.equal(true);
        expect(await actionService.canTakeFlag('Alice', activeGame._id)).to.equal(false);
        expect(await actionService.canGiveFlag('Bob', activeGame._id)).to.equal(true);
        expect(await actionService.canGiveFlag('Alice', activeGame._id)).to.equal(false);

        await actionService.takeFlag(activeGame._id, 'Alice');
        expect(activeGame.hasFlagId).to.equal('Alice');
        expect(activeGame.flagHolderHistory).to.include('Alice');

        await actionService.giveFlag(activeGame._id, 'Alice');
        const aliceHistoryEntries = activeGame.flagHolderHistory.filter((name) => name === 'Alice');
        expect(aliceHistoryEntries.length).to.equal(1);
        expect(activeGameService.saveActiveGameById.callCount).to.equal(2);
    });

    it('should create a flag action payload and decrement attacker actions', async () => {
        // Nominal case: request payload mirrors updated attacker state.
        const activeGame = createActiveGame();
        activeGame.players[0].actionsLeft = 2;
        activeGameService.getActiveGameById.resolves(activeGame);

        const payload = await actionService.flagActionRequest('Alice', 'Bob', activeGame._id);

        expect(payload).to.deep.equal({
            gameId: activeGame._id,
            currentPlayerName: 'Alice',
            currentPlayerActionsLeft: 1,
            targetPlayerName: 'Bob',
        });
        expect(activeGame.players[0].actionsLeft).to.equal(1);
        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
    });

    it('should add a new receiver to flag holder history when giving the flag', async () => {
        // Edge case: giveFlag should append holder history when the target is not already tracked.
        const activeGame = createActiveGame();
        activeGame.flagHolderHistory = ['Bob'];
        activeGameService.getActiveGameById.resolves(activeGame);

        await actionService.giveFlag(activeGame._id, 'Alice');

        expect(activeGame.hasFlagId).to.equal('Alice');
        expect(activeGame.flagHolderHistory).to.deep.equal(['Bob', 'Alice']);
        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
    });

    it('should reject action usage when game or players are missing', async () => {
        // Edge case: no active game.
        activeGameService.getActiveGameById.resolves(null);
        expect(await actionService.canUseAction('g1', 'Alice', 'Bob')).to.equal(false);

        // Edge case: current player cannot be found.
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);
        expect(await actionService.canUseAction(activeGame._id, 'Unknown', 'Bob')).to.equal(false);
    });

    it('should reject action usage when self-targeting, abandoned, out of turn, without actions, or not adjacent', async () => {
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);

        // Edge case: cannot target self.
        expect(await actionService.canUseAction(activeGame._id, 'Alice', 'Alice')).to.equal(false);

        // Edge case: abandoned target.
        activeGame.players[1].hasAbandoned = true;
        expect(await actionService.canUseAction(activeGame._id, 'Alice', 'Bob')).to.equal(false);

        // Edge case: wrong active player.
        activeGame.players[1].hasAbandoned = false;
        activeGame.currentPlayerIndex = 1;
        expect(await actionService.canUseAction(activeGame._id, 'Alice', 'Bob')).to.equal(false);

        // Edge case: no actions left.
        activeGame.currentPlayerIndex = 0;
        activeGame.players[0].actionsLeft = 0;
        expect(await actionService.canUseAction(activeGame._id, 'Alice', 'Bob')).to.equal(false);

        // Edge case: not adjacent.
        activeGame.players[0].actionsLeft = 1;
        positionValidatorService.isAdjacent.returns(false);
        expect(await actionService.canUseAction(activeGame._id, 'Alice', 'Bob')).to.equal(false);
    });

    it('should allow action usage when all combat preconditions are satisfied', async () => {
        // Nominal case: all preconditions pass, including adjacency.
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);
        positionValidatorService.isAdjacent.returns(true);

        const result = await actionService.canUseAction(activeGame._id, 'Alice', 'Bob');

        expect(result).to.equal(true);
    });

    it('should evaluate action availability against all defenders', async () => {
        // Edge case: no active game means no available target.
        activeGameService.getActiveGameById.resolves(null);
        expect(await actionService.canUseActionAnyPlayer('g1', 'Alice')).to.equal(false);

        // Nominal case: one reachable opponent is enough.
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);
        const canUseActionStub = sinon.stub(actionService, 'canUseAction');
        canUseActionStub.onCall(0).resolves(false);
        canUseActionStub.onCall(1).resolves(true);

        expect(await actionService.canUseActionAnyPlayer(activeGame._id, 'Alice')).to.equal(true);
    });

    it('should return false when no defender can be targeted for an action', async () => {
        // Edge case: every defender check fails, so the loop should reach the final false return.
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);
        const canUseActionStub = sinon.stub(actionService, 'canUseAction').resolves(false);

        const result = await actionService.canUseActionAnyPlayer(activeGame._id, 'Alice');

        expect(result).to.equal(false);
        expect(canUseActionStub.callCount).to.equal(activeGame.players.length);
    });

    it('should evaluate sanctuary action availability', async () => {
        // Edge case: game not found.
        activeGameService.getActiveGameById.resolves(null);
        expect(await actionService.canUseAnySanctuary('g1', 'Alice')).to.equal(false);

        // Edge case: player not found.
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);
        expect(await actionService.canUseAnySanctuary(activeGame._id, 'Unknown')).to.equal(false);

        // Edge case: no actions left.
        activeGame.players[0].actionsLeft = 0;
        expect(await actionService.canUseAnySanctuary(activeGame._id, 'Alice')).to.equal(false);

        // Edge case: no adjacent active sanctuary exists on the board.
        activeGame.players[0].actionsLeft = 1;
        activeGame.players[0].currentPosition = { x: 0, y: 0 };
        activeGame.game.board.items = [{ itemType: ItemType.LifeSanctuary, x: 2, y: 2, size: 4, active: true }];
        expect(await actionService.canUseAnySanctuary(activeGame._id, 'Alice')).to.equal(false);

        // Nominal case: active sanctuary adjacent to the player.
        activeGame.players[0].currentPosition = { x: 0, y: 1 };
        activeGame.game.board.items = [
            { itemType: ItemType.LifeSanctuary, x: 1, y: 1, size: 4, active: true },
            { itemType: ItemType.StartingPosition, x: 3, y: 3, size: SMALL_ITEM_SIZE },
        ];
        expect(await actionService.canUseAnySanctuary(activeGame._id, 'Alice')).to.equal(true);
    });

    it('should throw ActiveGameNotFound when resolving combat without an active game', async () => {
        // Edge case: combat resolution requires a valid active game.
        activeGameService.getActiveGameById.resolves(null);

        try {
            await actionService.resolveCombat('g1', 'Alice', 'Bob');
            throw new Error('Expected ActiveGameNotFound error');
        } catch (error) {
            expect((error as { status: number }).status).to.equal(StatusCodes.NOT_FOUND);
            expect((error as { errorCodes: ErrorCode[] }).errorCodes).to.deep.equal([ErrorCode.ActiveGameNotFound]);
        }
    });

    it('should delegate combat wrappers to CombatService', async () => {
        // Nominal case: wrappers return or forward CombatService outcomes.
        const activeGame = createActiveGame();
        const combatOutcome = { winner: 'Alice' };
        activeGameService.getActiveGameById.resolves(activeGame);
        combatService.resolveCombat.resolves(combatOutcome);
        combatService.applyCombatTurn.resolves(combatOutcome);
        combatService.autoChooseVirtualPostures.resolves();
        combatService.combatTurnCanBeApplied.resolves(true);

        expect(await actionService.resolveCombat(activeGame._id, 'Alice', 'Bob')).to.equal(combatOutcome);
        expect(await actionService.applyCombatTurn(activeGame._id)).to.equal(combatOutcome);
        await actionService.autoChooseVirtualPostures(activeGame._id);
        expect(await actionService.combatTurnCanBeApplied(activeGame._id)).to.equal(true);

        expect(combatService.resolveCombat.calledOnceWithExactly(activeGame, 'Alice', 'Bob')).to.equal(true);
        expect(combatService.applyCombatTurn.calledOnceWithExactly(activeGame._id)).to.equal(true);
        expect(combatService.autoChooseVirtualPostures.calledOnceWithExactly(activeGame._id)).to.equal(true);
        expect(combatService.combatTurnCanBeApplied.calledOnceWithExactly(activeGame._id)).to.equal(true);
    });
});

function createActiveGame(): IActiveGame {
    return {
        _id: 'active-game-1',
        game: {
            gameTitle: 'Action game',
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
        players: [createPlayer('Alice'), createPlayer('Bob')],
        currentPlayerIndex: 0,
        turnOrder: ['Alice', 'Bob'],
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

function createPlayer(name: string): ICharacter {
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
        startingPosition: name === 'Alice' ? { x: 0, y: 0 } : { x: 1, y: 0 },
        currentPosition: name === 'Alice' ? { x: 0, y: 0 } : { x: 1, y: 0 },
        team: name === 'Alice' ? Team.RED : Team.BLUE,
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [] as string[],
    };
}
