/**
 * Testing strategy — AgressivePlayerService target selection
 *
 * Approach:
 * - Replace movement, combat, sanctuary, socket, and adjacency dependencies with Sinon stubs.
 * - Exercise play() with CTF and classic game states to verify target-priority decisions.
 * - Assert when fallback sanctuary logic short-circuits versus when pursuit/combat continues.
 *
 * Edge cases covered:
 * - No reachable target in classic mode triggers sanctuary fallback with no combat.
 * - No reachable target in CTF mode skips sanctuary fallback.
 * - Far targets in CTF still pursue instead of consulting sanctuary fallback.
 * - Missing refreshed player or non-adjacent targets prevent combatManager execution.
 */
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { AgressivePlayerService } from '@app/services/virtual-player/agressive-player.service';
import { VirtualPlayerSanctuaryService } from '@app/services/virtual-player/virtual-player-sanctuary.service';
import { VirtualPlayerUtilitiesService } from '@app/services/virtual-player/virtual-player.utilities';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter, Team, VirtualPlayerProfile } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { expect } from 'chai';
import * as sinon from 'sinon';

describe('AgressivePlayerService', () => {
    let virtualPlayerUtilities: {
        findClosestReachablePlayer: sinon.SinonStub;
        moveToPlayer: sinon.SinonStub;
    };
    let gameplayActionService: {
        combatManager: sinon.SinonStub;
        emitGameLogToRoom: sinon.SinonStub;
    };
    let socketService: { getNamespace: sinon.SinonStub };
    let sanctuaryService: { tryFallbackObjective: sinon.SinonStub };
    let positionValidatorService: { isAdjacent: sinon.SinonStub };

    let service: AgressivePlayerService;

    beforeEach(() => {
        virtualPlayerUtilities = {
            findClosestReachablePlayer: sinon.stub(),
            moveToPlayer: sinon.stub().resolves(true),
        };
        gameplayActionService = {
            combatManager: sinon.stub().resolves(),
            emitGameLogToRoom: sinon.stub(),
        };
        socketService = { getNamespace: sinon.stub().returns({ to: sinon.stub().returns({ emit: sinon.stub() }) }) };
        sanctuaryService = { tryFallbackObjective: sinon.stub().resolves(false) };
        positionValidatorService = { isAdjacent: sinon.stub().returns(true) };

        service = new AgressivePlayerService(
            virtualPlayerUtilities as unknown as VirtualPlayerUtilitiesService,
            gameplayActionService as unknown as GameplayActionService,
            socketService as unknown as SocketService,
            sanctuaryService as unknown as VirtualPlayerSanctuaryService,
            positionValidatorService as unknown as PositionValidatorService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should prioritize pursuing enemy flag carrier in CTF', async () => {
        const bot = createCharacter('Bot', Team.RED);
        bot.virtualPlayerProfile = VirtualPlayerProfile.Agressive;
        const enemyCarrier = createCharacter('EnemyCarrier', Team.BLUE);
        const enemyOther = createCharacter('EnemyOther', Team.BLUE);
        const game = createGame([bot, enemyCarrier, enemyOther]);
        game.hasFlagId = enemyCarrier.name;

        virtualPlayerUtilities.findClosestReachablePlayer.returns({
            player: enemyCarrier,
            distance: 1,
            bestAdjacentIndex: 1,
        });

        await service.play(bot, game);

        expect(virtualPlayerUtilities.findClosestReachablePlayer.calledOnce).to.equal(true);
        const [, candidateTargets] = virtualPlayerUtilities.findClosestReachablePlayer.firstCall.args as [ICharacter, ICharacter[]];
        expect(candidateTargets).to.deep.equal([enemyCarrier]);
    });

    it('should fall back safely when no closest reachable adverse player exists', async () => {
        const bot = createCharacter('Bot', Team.RED);
        bot.virtualPlayerProfile = VirtualPlayerProfile.Agressive;
        const ally = createCharacter('Ally', Team.RED);
        const game = createGame([bot, ally], GameType.Classic);

        virtualPlayerUtilities.findClosestReachablePlayer.returns(null);

        await service.play(bot, game);

        expect(sanctuaryService.tryFallbackObjective.calledOnceWithExactly(bot, game)).to.equal(true);
        expect(virtualPlayerUtilities.moveToPlayer.called).to.equal(false);
        expect(gameplayActionService.combatManager.called).to.equal(false);
    });

    it('uses forced target when provided', async () => {
        const bot = createCharacter('Bot', Team.RED);
        const enemy = createCharacter('Enemy', Team.BLUE);
        const game = createGame([bot, enemy], GameType.Classic);
        virtualPlayerUtilities.findClosestReachablePlayer.returns({
            player: enemy,
            distance: 1,
            bestAdjacentIndex: 1,
        });

        await service.play(bot, game, enemy.name);

        const [, candidateTargets] = virtualPlayerUtilities.findClosestReachablePlayer.firstCall.args as [ICharacter, ICharacter[]];
        expect(candidateTargets).to.deep.equal([enemy]);
    });

    it('does not try fallback objective in ctf when no reachable target exists', async () => {
        const bot = createCharacter('Bot', Team.RED);
        const ally = createCharacter('Ally', Team.RED);
        const game = createGame([bot, ally], GameType.Ctf);
        virtualPlayerUtilities.findClosestReachablePlayer.returns(null);

        await service.play(bot, game);

        expect(sanctuaryService.tryFallbackObjective.called).to.equal(false);
    });

    // Edge case: CTF pathing should keep pursuing even when the target is farther than movement points.
    it('continues pursuit in ctf when the target is too far', async () => {
        const bot = createCharacter('Bot', Team.RED);
        const enemy = createCharacter('Enemy', Team.BLUE);
        const game = createGame([bot, enemy], GameType.Ctf);
        bot.movementLeft = 1;
        virtualPlayerUtilities.findClosestReachablePlayer.returns({
            player: enemy,
            distance: 3,
            bestAdjacentIndex: 1,
        });

        await service.play(bot, game);

        expect(sanctuaryService.tryFallbackObjective.called).to.equal(false);
        expect(virtualPlayerUtilities.moveToPlayer.calledOnce).to.equal(true);
    });

    // Edge case: a malformed distance value should still fall through to pursuit instead of fallback.
    it('continues pursuit when the reported distance is missing', async () => {
        const bot = createCharacter('Bot', Team.RED);
        const enemy = createCharacter('Enemy', Team.BLUE);
        const game = createGame([bot, enemy], GameType.Classic);
        virtualPlayerUtilities.findClosestReachablePlayer.returns({
            player: enemy,
            distance: undefined as never,
            bestAdjacentIndex: 1,
        });

        await service.play(bot, game);

        expect(sanctuaryService.tryFallbackObjective.called).to.equal(false);
        expect(virtualPlayerUtilities.moveToPlayer.calledOnce).to.equal(true);
    });

    it('returns early after successful fallback when target is too far in classic mode', async () => {
        const bot = createCharacter('Bot', Team.RED);
        const enemy = createCharacter('Enemy', Team.BLUE);
        const game = createGame([bot, enemy], GameType.Classic);
        bot.movementLeft = 1;
        virtualPlayerUtilities.findClosestReachablePlayer.returns({
            player: enemy,
            distance: 3,
            bestAdjacentIndex: 1,
        });
        sanctuaryService.tryFallbackObjective.resolves(true);

        await service.play(bot, game);

        expect(virtualPlayerUtilities.moveToPlayer.called).to.equal(false);
    });

    it('returns when refreshed player is missing after movement', async () => {
        const bot = createCharacter('Bot', Team.RED);
        const enemy = createCharacter('Enemy', Team.BLUE);
        const game = createGame([bot, enemy], GameType.Classic);
        virtualPlayerUtilities.findClosestReachablePlayer.returns({
            player: enemy,
            distance: 1,
            bestAdjacentIndex: 1,
        });
        // Edge case: refreshed bot lookup fails after movement state changes.
        game.players = [enemy];

        await service.play(bot, game);

        expect(gameplayActionService.combatManager.called).to.equal(false);
    });

    it('attackTargetIfPossible returns when target is missing or not adjacent', async () => {
        const bot = createCharacter('Bot', Team.RED);
        const enemy = createCharacter('Enemy', Team.BLUE);
        const game = createGame([bot, enemy]);

        // Edge cases: unknown target name and non-adjacent target both skip combat.
        await service.attackTargetIfPossible(bot, game, 'Missing');
        positionValidatorService.isAdjacent.returns(false);
        await service.attackTargetIfPossible(bot, game, enemy.name);

        expect(gameplayActionService.combatManager.called).to.equal(false);
    });

    it('returns immediately when fallback objective succeeds and no target is reachable', async () => {
        const bot = createCharacter('Bot', Team.RED);
        const ally = createCharacter('Ally', Team.RED);
        const game = createGame([bot, ally], GameType.Classic);
        virtualPlayerUtilities.findClosestReachablePlayer.returns(null);
        sanctuaryService.tryFallbackObjective.resolves(true);

        await service.play(bot, game);

        expect(virtualPlayerUtilities.moveToPlayer.called).to.equal(false);
        expect(gameplayActionService.combatManager.called).to.equal(false);
    });

    it('continues toward enemy when fallback objective fails for far target', async () => {
        const bot = createCharacter('Bot', Team.RED);
        const enemy = createCharacter('Enemy', Team.BLUE);
        const game = createGame([bot, enemy], GameType.Classic);
        bot.movementLeft = 1;
        virtualPlayerUtilities.findClosestReachablePlayer.returns({
            player: enemy,
            distance: 4,
            bestAdjacentIndex: 1,
        });
        sanctuaryService.tryFallbackObjective.resolves(false);

        await service.play(bot, game);

        expect(virtualPlayerUtilities.moveToPlayer.calledOnce).to.equal(true);
    });
});

function createGame(players: ICharacter[], gameMode: GameType = GameType.Ctf): IActiveGame {
    return {
        _id: 'game-1',
        game: {
            gameTitle: 'ctf',
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
                items: [],
            },
        },
        players,
        currentPlayerIndex: 0,
        turnOrder: players.map((player) => player.name),
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: players[0]?.name ?? 'org',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: '',
        turnStartTimeStamp: 0,
        currentAttack: null,
    };
}

function createCharacter(name: string, team: Team): ICharacter {
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
        movementLeft: 1,
        victories: 0,
        hasAbandoned: false,
        startingPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        team,
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}
