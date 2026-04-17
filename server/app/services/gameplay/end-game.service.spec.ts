/**
 * Testing strategy — EndGameService
 *
 * Approach:
 * - Validate abandon handling and end-game detection with stubbed ActiveGameService, TurnService, and flag-drop resolution.
 * - Cover both Classic and CTF completion branches, plus helper methods that format reasons and inspect organizer membership.
 *
 * Edge cases covered:
 * - Missing game/player abandon no-ops and already-finished game short-circuit behavior.
 * - CTF-specific cancellation and flag-return victory branches, including missing flag-item/drop fallbacks.
 * - Combat victory threshold computed from victories and nVictories counters.
 * - CTF winner fallback when the flag carrier has no team and reason-label formatting for each uncovered completion reason.
 */
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter, Team, VirtualPlayerProfile } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { ItemType } from '@common/items';
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

    it('returns not-ended result when active game is missing', async () => {
        activeGameService.getActiveGameById.resolves(null);

        const result = await endGameService.checkEndGame('missing-game');

        expect(result).to.deep.equal({
            hasEnded: false,
            winner: null,
            reason: null,
            completionType: null,
            remainingPlayers: [],
        });
    });

    it('returns not-ended result when game is already finished', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0, GameType.Classic);
        activeGame.isFinished = true;
        activeGame.winner = 'Alice';
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await endGameService.checkEndGame(activeGame._id);

        expect(result.hasEnded).to.equal(false);
        expect(result.winner).to.equal('Alice');
        expect(result.remainingPlayers).to.deep.equal(['Alice', 'Bob']);
    });

    it('declares ctf winner when flag holder returns to starting position', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0, GameType.Ctf);
        activeGame.players[0].team = Team.RED;
        activeGame.players[1].team = Team.BLUE;
        activeGame.hasFlagId = 'Alice';
        activeGame.players[0].currentPosition = { ...activeGame.players[0].startingPosition };
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await endGameService.checkEndGame(activeGame._id);

        expect(result.hasEnded).to.equal(true);
        expect(result.completionType).to.equal('victory');
        expect(result.reason).to.equal('ctf-flag-returned');
        expect(result.winner).to.equal('red team');
    });

    it('declares ctf completion with null winner when carrier has no team', async () => {
        // Edge case: winner fallback uses null when the flag carrier has no team metadata.
        const activeGame = createActiveGame(['Alice', 'Bob', 'Carol'], 0, GameType.Ctf);
        activeGame.players[0].team = undefined;
        activeGame.players[1].team = Team.BLUE;
        activeGame.players[2].team = Team.RED;
        activeGame.hasFlagId = 'Alice';
        activeGame.players[0].currentPosition = { ...activeGame.players[0].startingPosition };
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await endGameService.checkEndGame(activeGame._id);

        expect(result.hasEnded).to.equal(true);
        expect(result.reason).to.equal('ctf-flag-returned');
        expect(result.winner).to.equal(null);
    });

    it('returns false for ctf check when no flag holder exists', () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0, GameType.Ctf);
        activeGame.hasFlagId = 'Unknown';

        const hasWon = endGameService.checkCTFWinCondition(activeGame);

        expect(hasWon).to.equal(false);
    });

    it('returns false for ctf check in classic mode', () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0, GameType.Classic);

        const hasWon = endGameService.checkCTFWinCondition(activeGame);

        expect(hasWon).to.equal(false);
    });

    it('checks organizer membership correctly', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0, GameType.Classic);
        activeGame.organizerName = 'Alice';
        activeGameService.getActiveGameById.onFirstCall().resolves(activeGame);
        activeGameService.getActiveGameById.onSecondCall().resolves(activeGame);
        activeGameService.getActiveGameById.onThirdCall().resolves(null);

        const isOrganizer = await endGameService.checkIfOrganizer(activeGame._id, 'Alice');
        const isNotOrganizer = await endGameService.checkIfOrganizer(activeGame._id, 'Bob');
        const missingGameOrganizer = await endGameService.checkIfOrganizer('missing-game', 'Alice');

        expect(isOrganizer).to.equal(true);
        expect(isNotOrganizer).to.equal(false);
        expect(missingGameOrganizer).to.equal(false);
    });

    it('returns a default end-game reason label when reason is null', () => {
        const message = endGameService.getEndGameLogMessage({
            hasEnded: false,
            winner: null,
            reason: null,
            completionType: null,
            remainingPlayers: [],
        });

        expect(message).to.equal('Fin de partie: la condition de fin est atteinte. Joueurs restants: aucun.');
    });

    it('handles abandon no-op paths when game or player is missing', async () => {
        activeGameService.getActiveGameById.onFirstCall().resolves(null);

        await endGameService.handlePlayerAbandon('Alice', 'missing-game');

        const activeGame = createActiveGame(['Alice', 'Bob'], 0);
        activeGameService.getActiveGameById.onSecondCall().resolves(activeGame);
        await endGameService.handlePlayerAbandon('Unknown', activeGame._id);

        expect(activeGameService.saveActiveGameById.called).to.equal(false);
        expect(turnService.endTurn.called).to.equal(false);
    });

    it('drops flag and keeps turn when non-current ctf carrier abandons', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob', 'Carol'], 0, GameType.Ctf);
        activeGame.players[0].team = Team.RED;
        activeGame.players[1].team = Team.BLUE;
        activeGame.players[2].team = Team.RED;
        activeGame.hasFlagId = 'Bob';
        activeGame.players[1].currentPosition = { x: 1, y: 0 };
        activeGame.players[1].startingPosition = { x: 0, y: 1 };
        activeGame.game.board.items = [{ itemType: ItemType.Flag, x: 1, y: 0, size: 1, isCarried: true }];
        positionValidatorService.resolveFlagDropPosition.returns({ x: 2, y: 2 });
        activeGameService.getActiveGameById.resolves(activeGame);

        await endGameService.handlePlayerAbandon('Bob', activeGame._id);

        expect(activeGame.hasFlagId).to.equal('');
        expect(activeGame.game.board.items[0].isCarried).to.equal(false);
        expect(activeGame.game.board.items[0].x).to.equal(2);
        expect(activeGame.game.board.items[0].y).to.equal(2);
        expect(turnService.endTurn.called).to.equal(false);
    });

    it('does not drop flag when ctf carrier item is missing', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob', 'Carol'], 0, GameType.Ctf);
        activeGame.hasFlagId = 'Bob';
        activeGame.players[1].currentPosition = { x: 1, y: 0 };
        activeGame.game.board.items = [];
        activeGameService.getActiveGameById.resolves(activeGame);

        await endGameService.handlePlayerAbandon('Bob', activeGame._id);

        expect(activeGame.hasFlagId).to.equal('Bob');
        expect(positionValidatorService.resolveFlagDropPosition.called).to.equal(false);
    });

    it('uses max between victories and nVictories for combat-win threshold', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0, GameType.Classic);
        activeGame.players[0].victories = 0;
        activeGame.players[0].nVictories = 3;
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await endGameService.checkEndGame(activeGame._id);

        expect(result.hasEnded).to.equal(true);
        expect(result.winner).to.equal('Alice');
    });

    it('returns not-ended when no end-game condition is met', async () => {
        // Edge case: non-finite victory counters are treated as zero.
        const activeGame = createActiveGame(['Alice', 'Bob', 'Carol'], 0, GameType.Classic);
        activeGame.players[0].victories = Number.NaN;
        activeGame.players[0].nVictories = Number.NaN;
        activeGameService.getActiveGameById.resolves(activeGame);

        const result = await endGameService.checkEndGame(activeGame._id);

        expect(result.hasEnded).to.equal(false);
        expect(result.reason).to.equal(null);
        expect(result.remainingPlayers).to.deep.equal(['Alice', 'Bob', 'Carol']);
    });

    it('formats cancellation reason labels for ctf-team-eliminated', () => {
        const message = endGameService.getEndGameLogMessage({
            hasEnded: true,
            winner: null,
            reason: 'ctf-team-eliminated',
            completionType: 'canceled',
            remainingPlayers: ['Alice'],
        });

        expect(message).to.equal("Partie annulée: une equipe n'a plus de joueur actif. Joueurs restants: Alice.");
    });

    it('formats ctf-flag-returned reason label', () => {
        const message = endGameService.getEndGameLogMessage({
            hasEnded: true,
            winner: 'red team',
            reason: 'ctf-flag-returned',
            completionType: 'victory',
            remainingPlayers: ['Alice', 'Bob'],
        });

        expect(message).to.equal('Fin de partie: le drapeau a ete ramene au point de depart. Joueurs restants: Alice, Bob.');
    });

    it('formats reason labels for uncovered combat and cancellation paths', () => {
        // Nominal + Edge cases: explicit winner, fallback winner, and cancellation labels.
        const ended = (
            winner: string | null,
            reason: 'combat-victories' | 'insufficient-active-players' | 'no-human-players',
            completionType: 'victory' | 'canceled',
            remainingPlayers: string[],
        ) => ({ hasEnded: true, winner, reason, completionType, remainingPlayers });
        const explicitWinnerMessage = 'Fin de partie: Alice a atteint 3 victoires de combat. Joueurs restants: Alice.';
        const fallbackWinnerMessage = 'Fin de partie: Un joueur a atteint 3 victoires de combat. Joueurs restants: aucun.';
        const insufficientPlayersMessage = 'Partie annulée: il ne reste pas assez de joueurs actifs. Joueurs restants: Alice.';
        const noHumanPlayersMessage = 'Partie annulée: il ne reste plus de joueurs humains. Joueurs restants: Bot-1.';
        const cases = [
            [ended('Alice', 'combat-victories', 'victory', ['Alice']), explicitWinnerMessage],
            [ended(null, 'combat-victories', 'victory', []), fallbackWinnerMessage],
            [ended(null, 'insufficient-active-players', 'canceled', ['Alice']), insufficientPlayersMessage],
            [ended(null, 'no-human-players', 'canceled', ['Bot-1']), noHumanPlayersMessage],
        ] as const;

        for (const testCase of cases) {
            expect(endGameService.getEndGameLogMessage(testCase[0])).to.equal(testCase[1]);
        }
    });

    it('returns early when dropping flag and carrier cannot be found', () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0, GameType.Ctf);
        activeGame.hasFlagId = 'Ghost';
        activeGame.game.board.items = [{ itemType: ItemType.Flag, x: 1, y: 1, size: 1, isCarried: true }];
        const privateService = endGameService as unknown as {
            dropFlagIfCarrierAbandons: (game: IActiveGame, playerName: string, position: { x: number; y: number }) => void;
        };

        privateService.dropFlagIfCarrierAbandons(activeGame, 'Ghost', { x: 1, y: 1 });

        expect(activeGame.hasFlagId).to.equal('Ghost');
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
