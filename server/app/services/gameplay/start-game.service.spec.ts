/**
 * Testing strategy — StartGameService
 *
 * Approach:
 * - Exercise initializeGame() end-to-end: spawn assignment, visited-cell initialization, turn-order computation, and persistence.
 * - Control randomness to make spawn allocation and tie shuffling deterministic.
 *
 * Edge cases covered:
 * - CTF team balancing with an odd number of players.
 * - Tie-group randomization branch during turn-order generation.
 */
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { StartGameService } from '@app/services/gameplay/start-game.service';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { Avatar, DiceType } from '@common/constants';
import { ICharacter, Team } from '@common/character';
import { GameType, Visibility } from '@common/game';
import { ItemType, SMALL_ITEM_SIZE } from '@common/items';
import { expect } from 'chai';
import * as sinon from 'sinon';

const TIE_SHUFFLE_CALL_INDEX = 3;
const RANDOM_VALUE = 0.2;
const RAPIDITY_ALICE = 6;
const RAPIDITY_OTHERS = 4;

describe('StartGameService', () => {
    let startGameService: StartGameService;
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
        saveActiveGameById: sinon.SinonStub;
    };

    beforeEach(() => {
        activeGameService = {
            getActiveGameById: sinon.stub(),
            saveActiveGameById: sinon.stub().resolves(),
        };
        startGameService = new StartGameService(activeGameService as unknown as ActiveGameService);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should initialize a classic game with unique spawn positions and persisted state', async () => {
        // Nominal case: classic mode initializes players and turn order then persists.
        const activeGame = createActiveGame(GameType.Classic);
        activeGameService.getActiveGameById.resolves(activeGame);
        const randomStub = sinon.stub(Math, 'random');
        randomStub.onCall(0).returns(0); // Alice gets first spawn tile
        randomStub.onCall(1).returns(0); // Bob gets first remaining spawn tile
        randomStub.onCall(2).returns(0); // Cara gets last spawn tile
        randomStub.onCall(TIE_SHUFFLE_CALL_INDEX).returns(0); // Tie shuffle

        await startGameService.initializeGame(activeGame._id);

        expect(activeGame.startedAt).to.be.instanceOf(Date);
        expect(activeGame.players.map((player) => player.currentPosition)).to.deep.equal([
            { x: 0, y: 0 },
            { x: 1, y: 0 },
            { x: 0, y: 1 },
        ]);
        expect(activeGame.players.every((player) => player.visitedCells.length === 1)).to.equal(true);
        expect(activeGame.turnOrder[0]).to.equal('Alice');
        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
    });

    it('should assign red and blue teams when initializing a CTF game', async () => {
        // Edge case: odd player count in CTF still splits into both teams.
        const activeGame = createActiveGame(GameType.Ctf);
        activeGameService.getActiveGameById.resolves(activeGame);
        const randomStub = sinon.stub(Math, 'random').returns(RANDOM_VALUE);

        await startGameService.initializeGame(activeGame._id);

        const redCount = activeGame.players.filter((player) => player.team === Team.RED).length;
        const blueCount = activeGame.players.filter((player) => player.team === Team.BLUE).length;

        expect(redCount + blueCount).to.equal(activeGame.players.length);
        expect(redCount).to.equal(2);
        expect(blueCount).to.equal(1);
        expect(randomStub.called).to.equal(true);
    });
});

function createActiveGame(gameMode: GameType): IActiveGame {
    return {
        _id: 'active-game-1',
        game: {
            gameTitle: 'Start game',
            description: '',
            gameMode,
            dateCreated: new Date('2026-01-01T00:00:00.000Z'),
            lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
            visibility: Visibility.Hidden,
            board: {
                cells: [
                    [CellType.Empty, CellType.Empty],
                    [CellType.Empty, CellType.Empty],
                ],
                items: [
                    { itemType: ItemType.StartingPosition, x: 0, y: 0, size: SMALL_ITEM_SIZE },
                    { itemType: ItemType.StartingPosition, x: 1, y: 0, size: SMALL_ITEM_SIZE },
                    { itemType: ItemType.StartingPosition, x: 0, y: 1, size: SMALL_ITEM_SIZE },
                ],
            },
        },
        players: [createPlayer('Alice', RAPIDITY_ALICE), createPlayer('Bob', RAPIDITY_OTHERS), createPlayer('Cara', RAPIDITY_OTHERS)],
        currentPlayerIndex: 0,
        turnOrder: [],
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

function createPlayer(name: string, rapidityPoints: number): ICharacter {
    return {
        name,
        avatar: Avatar.Avatar1,
        initialHealth: 6,
        currentHealth: 6,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints,
        attackPoints: 4,
        defensePoints: 4,
        actionsLeft: 1,
        movementLeft: 4,
        victories: 0,
        hasAbandoned: false,
        startingPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        team: null,
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [] as string[],
    };
}
