/**
 * Testing strategy — DefensivePlayerService threat response
 *
 * Approach:
 * - Stub movement, attack, and sanctuary services to isolate play() decision-making.
 * - Validate CTF branches for carrier interception versus evasive movement behavior.
 * - Validate classic-mode fallback flow before adverse-player avoidance is applied.
 *
 * Edge cases covered:
 * - Abandoned flag carriers are ignored during CTF interception checks.
 * - Abandoned players are excluded from adverse lists in classic mode.
 * - Failed sanctuary fallback in classic mode still leads to evasive movement.
 */
import { AgressivePlayerService } from '@app/services/virtual-player/agressive-player.service';
import { DefensivePlayerService } from '@app/services/virtual-player/defensive-player.service';
import { VirtualPlayerSanctuaryService } from '@app/services/virtual-player/virtual-player-sanctuary.service';
import { VirtualPlayerUtilitiesService } from '@app/services/virtual-player/virtual-player.utilities';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter, Team, VirtualPlayerProfile } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { expect } from 'chai';
import * as sinon from 'sinon';

// Shared test fixtures.

function makeCharacter(name: string, team: Team = Team.RED, overrides: Partial<ICharacter> = {}): ICharacter {
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
        startingPosition: { x: 2, y: 2 },
        currentPosition: { x: 0, y: 0 },
        team,
        virtualPlayerProfile: VirtualPlayerProfile.Defensive,
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
        ...overrides,
    };
}

function makeGame(players: ICharacter[], gameMode: GameType = GameType.Ctf, hasFlagId: string | null = null): IActiveGame {
    return {
        _id: 'game-1',
        game: {
            gameTitle: 'Test',
            description: '',
            gameMode,
            dateCreated: new Date(),
            lastModifiedDate: new Date(),
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
        hasFlagId,
        turnStartTimeStamp: 0,
        currentAttack: null,
    };
}

// play() behavior tests.

describe('DefensivePlayerService', () => {
    let virtualPlayerUtilities: {
        moveAwayFromPlayers: sinon.SinonStub;
        moveToPositionOrNearest: sinon.SinonStub;
    };
    let aggressivePlayerService: {
        attackTargetIfPossible: sinon.SinonStub;
    };
    let sanctuaryService: {
        tryFallbackObjective: sinon.SinonStub;
    };
    let service: DefensivePlayerService;

    beforeEach(() => {
        virtualPlayerUtilities = {
            moveAwayFromPlayers: sinon.stub().resolves(),
            moveToPositionOrNearest: sinon.stub().resolves(true),
        };
        aggressivePlayerService = {
            attackTargetIfPossible: sinon.stub().resolves(),
        };
        sanctuaryService = {
            tryFallbackObjective: sinon.stub().resolves(false),
        };

        service = new DefensivePlayerService(
            virtualPlayerUtilities as unknown as VirtualPlayerUtilitiesService,
            aggressivePlayerService as unknown as AgressivePlayerService,
            sanctuaryService as unknown as VirtualPlayerSanctuaryService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    // CTF branch: intercept an enemy flag carrier.

    it('should block enemy flag carrier and attack in CTF mode — Nominal case', async () => {
        const bot = makeCharacter('Bot', Team.RED);
        const carrier = makeCharacter('Carrier', Team.BLUE);
        carrier.startingPosition = { x: 2, y: 2 };
        const game = makeGame([bot, carrier], GameType.Ctf, 'Carrier');

        await service.play(bot, game);

        expect(virtualPlayerUtilities.moveToPositionOrNearest.calledOnceWithExactly(bot, game, carrier.startingPosition)).to.equal(true);
        expect(aggressivePlayerService.attackTargetIfPossible.calledOnceWithExactly(bot, game, 'Carrier')).to.equal(true);
        expect(virtualPlayerUtilities.moveAwayFromPlayers.called).to.equal(false);
    });

    it('should not block when flag carrier is on the same team — Nominal case', async () => {
        const bot = makeCharacter('Bot', Team.RED);
        const ally = makeCharacter('Ally', Team.RED);
        // Nominal case: allied carrier should not trigger an interception attempt.
        const game = makeGame([bot, ally], GameType.Ctf, 'Ally');

        await service.play(bot, game);

        // Expected fallback behavior is evasive movement logic only.
        expect(virtualPlayerUtilities.moveToPositionOrNearest.called).to.equal(false);
        expect(virtualPlayerUtilities.moveAwayFromPlayers.calledOnce).to.equal(true);
    });

    it('should not block an abandoned enemy carrier — Edge case', async () => {
        const bot = makeCharacter('Bot', Team.RED);
        const carrier = makeCharacter('Carrier', Team.BLUE, { hasAbandoned: true });
        const game = makeGame([bot, carrier], GameType.Ctf, 'Carrier');

        await service.play(bot, game);

        expect(virtualPlayerUtilities.moveToPositionOrNearest.called).to.equal(false);
    });

    // CTF branch: no interceptable carrier exists.

    it('should move away from adverse players when no carrier exists in CTF — Nominal case', async () => {
        const bot = makeCharacter('Bot', Team.RED);
        const enemy = makeCharacter('Enemy', Team.BLUE);
        const game = makeGame([bot, enemy], GameType.Ctf);

        await service.play(bot, game);

        expect(virtualPlayerUtilities.moveToPositionOrNearest.called).to.equal(false);
        expect(virtualPlayerUtilities.moveAwayFromPlayers.calledOnce).to.equal(true);
        const [, , adversePlayers] = virtualPlayerUtilities.moveAwayFromPlayers.firstCall.args;
        expect(adversePlayers).to.deep.include(enemy);
    });

    it('should not include same-team players in the adverse list in CTF mode — Nominal case', async () => {
        const bot = makeCharacter('Bot', Team.RED);
        const ally = makeCharacter('Ally', Team.RED);
        const enemy = makeCharacter('Enemy', Team.BLUE);
        const game = makeGame([bot, ally, enemy], GameType.Ctf);

        await service.play(bot, game);

        const [, , adversePlayers] = virtualPlayerUtilities.moveAwayFromPlayers.firstCall.args;
        expect(adversePlayers).to.not.deep.include(ally);
        expect(adversePlayers).to.deep.include(enemy);
    });

    // Classic branch: sanctuary fallback then evasive movement.

    it('should attempt fallback objective when alone in classic mode — Nominal case', async () => {
        const bot = makeCharacter('Bot', Team.RED);
        const game = makeGame([bot], GameType.Classic);

        sanctuaryService.tryFallbackObjective.resolves(true);

        await service.play(bot, game);

        expect(sanctuaryService.tryFallbackObjective.calledOnce).to.equal(true);
        expect(virtualPlayerUtilities.moveAwayFromPlayers.called).to.equal(false);
    });

    it('should move away when fallback objective fails in classic mode — Nominal case', async () => {
        const bot = makeCharacter('Bot', Team.RED);
        const game = makeGame([bot], GameType.Classic);

        sanctuaryService.tryFallbackObjective.resolves(false);

        await service.play(bot, game);

        expect(virtualPlayerUtilities.moveAwayFromPlayers.calledOnce).to.equal(true);
    });

    it('should skip abandoned players when building adverse list — Edge case', async () => {
        const bot = makeCharacter('Bot', Team.RED);
        const abandoned = makeCharacter('Ghost', Team.BLUE, { hasAbandoned: true });
        const game = makeGame([bot, abandoned], GameType.Classic);

        await service.play(bot, game);

        const [, , adversePlayers] = virtualPlayerUtilities.moveAwayFromPlayers.firstCall.args;
        expect(adversePlayers).to.not.deep.include(abandoned);
    });

    it('should include all non-self non-abandoned players as adverse in classic mode — Nominal case', async () => {
        const bot = makeCharacter('Bot', Team.RED);
        const p1 = makeCharacter('P1', Team.BLUE);
        const p2 = makeCharacter('P2', Team.RED); // In classic mode, team membership does not affect adverse targeting.
        const game = makeGame([bot, p1, p2], GameType.Classic);

        await service.play(bot, game);

        const [, , adversePlayers] = virtualPlayerUtilities.moveAwayFromPlayers.firstCall.args;
        expect(adversePlayers).to.have.length(2);
        expect(adversePlayers).to.deep.include(p1);
        expect(adversePlayers).to.deep.include(p2);
    });
});
