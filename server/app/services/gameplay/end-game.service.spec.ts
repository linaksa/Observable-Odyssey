import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter, Team, VirtualPlayerProfile } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { expect } from 'chai';
import * as sinon from 'sinon';

describe('EndGameService', () => {
    let endGameService: EndGameService;
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
        saveActiveGameById: sinon.SinonStub;
    };
    let turnService: {
        endTurn: sinon.SinonStub;
    };
    let positionValidatorService: {
        resolveFlagDropPosition: sinon.SinonStub;
    };

    beforeEach(() => {
        activeGameService = {
            getActiveGameById: sinon.stub(),
            saveActiveGameById: sinon.stub().resolves(),
        };
        turnService = {
            endTurn: sinon.stub().resolves(),
        };
        positionValidatorService = {
            resolveFlagDropPosition: sinon.stub().returns({ x: 0, y: 0 }),
        };

        endGameService = new EndGameService(
            activeGameService as unknown as ActiveGameService,
            turnService as unknown as TurnService,
            positionValidatorService as unknown as PositionValidatorService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should mark the abandoning player as inactive in the active roster', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob', 'Carol'], 1);
        activeGameService.getActiveGameById.resolves(activeGame);

        await endGameService.handlePlayerAbandon('Bob', activeGame._id);

        expect(activeGame.players.map((player) => player.name)).to.deep.equal(['Alice', 'Bob', 'Carol']);
        expect(activeGame.players[1].hasAbandoned).to.equal(true);
        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
        expect(turnService.endTurn.calledOnceWithExactly(activeGame._id)).to.equal(true);
    });

    it('should stop after marking the last remaining opponent as abandoned', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0);
        activeGameService.getActiveGameById.resolves(activeGame);

        await endGameService.handlePlayerAbandon('Bob', activeGame._id);

        expect(activeGame.players.map((player) => player.name)).to.deep.equal(['Alice', 'Bob']);
        expect(activeGame.players[1].hasAbandoned).to.equal(true);
        expect(turnService.endTurn.called).to.equal(false);
    });

    it('should cancel a classic game when only one active player remains', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0, GameType.Classic);
        activeGame.players[1].hasAbandoned = true;
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await endGameService.checkEndGame(activeGame._id);

        expect(result.hasEnded).to.equal(true);
        expect(result.completionType).to.equal('canceled');
        expect(result.reason).to.equal('insufficient-active-players');
        expect(result.winner).to.equal(null);
    });

    it('should cancel the game when no human players remain', async () => {
        const activeGame = createActiveGame(['Bot-1', 'Bot-2'], 0, GameType.Classic);
        activeGame.players[0].virtualPlayerProfile = VirtualPlayerProfile.Agressive;
        activeGame.players[1].virtualPlayerProfile = VirtualPlayerProfile.Defensive;
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await endGameService.checkEndGame(activeGame._id);

        expect(result.hasEnded).to.equal(true);
        expect(result.completionType).to.equal('canceled');
        expect(result.reason).to.equal('no-human-players');
        expect(result.winner).to.equal(null);
    });

    it('should cancel ctf game when one team has no active player', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0, GameType.Ctf);
        activeGame.players[0].team = Team.RED;
        activeGame.players[1].team = Team.BLUE;
        activeGame.players[0].hasAbandoned = true;
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await endGameService.checkEndGame(activeGame._id);

        expect(result.hasEnded).to.equal(true);
        expect(result.completionType).to.equal('canceled');
        expect(result.reason).to.equal('ctf-team-eliminated');
        expect(result.winner).to.equal(null);
    });

    it('should end the game with a winner when combat victories threshold is reached', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0, GameType.Classic);
        activeGame.players[0].victories = 3;
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await endGameService.checkEndGame(activeGame._id);

        expect(result.hasEnded).to.equal(true);
        expect(result.completionType).to.equal('victory');
        expect(result.reason).to.equal('combat-victories');
        expect(result.winner).to.equal('Alice');
    });
});

function createActiveGame(playerNames: string[], currentPlayerIndex: number, gameMode: GameType = GameType.Classic): IActiveGame {
    const players = playerNames.map((name) => createCharacter(name));

    return {
        _id: 'active-game-1',
        game: {
            gameTitle: 'Arena',
            description: '',
            gameMode,
            dateCreated: new Date('2026-01-01T00:00:00.000Z'),
            lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
            visibility: Visibility.Viewable,
            board: {
                cells: [[CellType.Empty]],
                items: [],
            },
        },
        players,
        currentPlayerIndex,
        turnOrder: playerNames,
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Alice',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: '',
        turnStartTimeStamp: 0,
        currentAttack: null,
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
        visitedCells: [],
    };
}
