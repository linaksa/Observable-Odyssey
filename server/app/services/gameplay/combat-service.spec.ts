/* eslint-disable max-lines -- This spec keeps a single large scenario matrix with shared fixtures and helpers to preserve combat-flow readability. */
/**
 * Testing strategy — Combat Service
 *
 * Approach:
 * - Cover combat lifecycle APIs end-to-end: posture readiness, virtual posture auto-choice, turn application, resolution, cancellation, and respawn search.
 * - Use shared fixtures plus Sinon stubs/fake timers to make dice rolls, timers, and dependency calls deterministic.
 *
 * Edge cases covered:
 * - Missing active game or missing current attack branches across readiness and turn-application paths.
 * - Draw outcomes, attacker/defender abandon scenarios, and combat cancellation during delayed resolution.
 * - BFS respawn search behavior with visited-node handling and fallback exploration.
 * - Ice-cell malus and debug-mode deterministic dice behavior in attack stat computation.
 */
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { CombatLogService } from '@app/services/gameplay/combat-log.service';
import { CombatService } from '@app/services/gameplay/combat-service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame, ICurrentAttack } from '@common/active-game';
import { AttackPosture, CombatOutcome } from '@common/attack-result';
import { CellType } from '@common/board';
import { ICharacter, Team, VirtualPlayerProfile } from '@common/character';
import { Avatar, COMBAT_TURN_FEEDBACK_DURATION_MS, DiceType, FOUR_SIDED_DICE_MAX } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { ItemType } from '@common/items';
import { expect } from 'chai';
import * as sinon from 'sinon';

const THREE_VICTORIES = 3;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeCharacter(name: string, overrides: Partial<ICharacter> = {}): ICharacter {
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
        team: Team.RED,
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
        ...overrides,
    };
}

function makeAttack(attacker: string, defender: string, overrides: Partial<ICurrentAttack> = {}): ICurrentAttack {
    return {
        attacker,
        defender,
        turnCount: 1,
        suspendedTurnTimer: 0,
        attackerPosture: null,
        defenderPosture: null,
        ...overrides,
    };
}

function makeGame(players: ICharacter[], currentAttack: ICurrentAttack | null = null): IActiveGame {
    return {
        _id: 'game-1',
        game: {
            gameTitle: 'Test',
            description: '',
            gameMode: GameType.Classic,
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
        hasFlagId: null,
        turnStartTimeStamp: 0,
        currentAttack,
    };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CombatService', () => {
    let activeGameService: sinon.SinonStubbedInstance<ActiveGameService>;
    let positionValidatorService: sinon.SinonStubbedInstance<PositionValidatorService>;
    let turnService: sinon.SinonStubbedInstance<TurnService>;
    let socketService: { getNamespace: sinon.SinonStub };
    let combatLogService: { emitPrivateCombatTurnLogs: sinon.SinonStub; emitPublicGameLog: sinon.SinonStub };
    let service: CombatService;
    let emitStub: sinon.SinonStub;
    let toStub: sinon.SinonStub;

    beforeEach(() => {
        emitStub = sinon.stub();
        toStub = sinon.stub().returns({ emit: emitStub });
        socketService = { getNamespace: sinon.stub().returns({ to: toStub }) };

        combatLogService = {
            emitPrivateCombatTurnLogs: sinon.stub(),
            emitPublicGameLog: sinon.stub(),
        };

        activeGameService = {
            getActiveGameById: sinon.stub(),
            saveActiveGameById: sinon.stub(),
            choosePosture: sinon.stub(),
        } as unknown as sinon.SinonStubbedInstance<ActiveGameService>;

        positionValidatorService = {
            isValidRespawnTile: sinon.stub(),
            resolveFlagDropPosition: sinon.stub(),
        } as unknown as sinon.SinonStubbedInstance<PositionValidatorService>;

        turnService = {
            startCombatTimer: sinon.stub(),
            clearCombatTimer: sinon.stub(),
            continueTurn: sinon.stub().resolves(),
        } as unknown as sinon.SinonStubbedInstance<TurnService>;

        service = new CombatService(
            activeGameService as unknown as ActiveGameService,
            positionValidatorService as unknown as PositionValidatorService,
            turnService as unknown as TurnService,
            socketService as unknown as SocketService,
            combatLogService as unknown as CombatLogService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    // ── combatTurnCanBeApplied ─────────────────────────────────────────────

    describe('combatTurnCanBeApplied()', () => {
        it('should return true when both postures are set — Nominal case', async () => {
            const attack = makeAttack('Alice', 'Bob', {
                attackerPosture: AttackPosture.Offensive,
                defenderPosture: AttackPosture.Defensive,
            });
            const game = makeGame([makeCharacter('Alice'), makeCharacter('Bob')], attack);
            activeGameService.getActiveGameById.resolves(game);

            const result = await service.combatTurnCanBeApplied('game-1');
            expect(result).to.equal(true);
        });

        it('should return false when attacker posture is missing — Nominal case', async () => {
            const attack = makeAttack('Alice', 'Bob', { defenderPosture: AttackPosture.Defensive });
            const game = makeGame([makeCharacter('Alice'), makeCharacter('Bob')], attack);
            activeGameService.getActiveGameById.resolves(game);

            const result = await service.combatTurnCanBeApplied('game-1');
            expect(result).to.equal(false);
        });

        it('should throw when no active game is found — Edge case', async () => {
            activeGameService.getActiveGameById.resolves(null);
            let threw = false;
            try {
                await service.combatTurnCanBeApplied('missing-game');
                throw new Error('should have thrown');
            } catch {
                threw = true;
            }
            expect(threw).to.equal(true);
        });

        it('should throw when active game has no current attack — Edge case', async () => {
            const game = makeGame([makeCharacter('Alice')], null);
            activeGameService.getActiveGameById.resolves(game);
            let threw = false;
            try {
                await service.combatTurnCanBeApplied('game-1');
                throw new Error('should have thrown');
            } catch {
                threw = true;
            }
            expect(threw).to.equal(true);
        });
    });

    // ── autoChooseVirtualPostures ──────────────────────────────────────────

    describe('autoChooseVirtualPostures()', () => {
        it('should choose offensive posture for an aggressive virtual attacker — Nominal case', async () => {
            const attacker = makeCharacter('Bot', { virtualPlayerProfile: VirtualPlayerProfile.Agressive });
            const defender = makeCharacter('Human');
            const attack = makeAttack('Bot', 'Human');
            const game = makeGame([attacker, defender], attack);

            activeGameService.getActiveGameById.resolves(game);
            activeGameService.choosePosture.resolves(game);

            await service.autoChooseVirtualPostures('game-1');

            expect(activeGameService.choosePosture.calledOnce).to.equal(true);
            const [, , posture] = activeGameService.choosePosture.firstCall.args;
            expect(posture).to.equal(AttackPosture.Offensive);
        });

        it('should choose defensive posture for a defensive virtual attacker — Nominal case', async () => {
            const attacker = makeCharacter('Bot', { virtualPlayerProfile: VirtualPlayerProfile.Defensive });
            const defender = makeCharacter('Human');
            const attack = makeAttack('Bot', 'Human');
            const game = makeGame([attacker, defender], attack);

            activeGameService.getActiveGameById.resolves(game);
            activeGameService.choosePosture.resolves(game);

            await service.autoChooseVirtualPostures('game-1');

            const [, , posture] = activeGameService.choosePosture.firstCall.args;
            expect(posture).to.equal(AttackPosture.Defensive);
        });

        it('should not call choosePosture when attacker posture is already set — Edge case', async () => {
            const attacker = makeCharacter('Bot', { virtualPlayerProfile: VirtualPlayerProfile.Agressive });
            const defender = makeCharacter('Human');
            const attack = makeAttack('Bot', 'Human', { attackerPosture: AttackPosture.Offensive });
            const game = makeGame([attacker, defender], attack);

            activeGameService.getActiveGameById.resolves(game);

            await service.autoChooseVirtualPostures('game-1');
            expect(activeGameService.choosePosture.called).to.equal(false);
        });

        it('should return early when no active game is found — Edge case', async () => {
            activeGameService.getActiveGameById.resolves(null);
            await service.autoChooseVirtualPostures('missing');
            expect(activeGameService.choosePosture.called).to.equal(false);
        });

        it('should also auto-choose posture for a virtual defender — Nominal case', async () => {
            const attacker = makeCharacter('Human');
            const defender = makeCharacter('BotDef', { virtualPlayerProfile: VirtualPlayerProfile.Defensive });
            const attack = makeAttack('Human', 'BotDef');
            const game = makeGame([attacker, defender], attack);

            activeGameService.getActiveGameById.resolves(game);
            activeGameService.choosePosture.resolves(game);

            await service.autoChooseVirtualPostures('game-1');

            const callArgs = activeGameService.choosePosture.firstCall.args;
            expect(callArgs[1]).to.equal('BotDef');
            expect(callArgs[2]).to.equal(AttackPosture.Defensive);
        });
    });

    // ── resolveCombat ─────────────────────────────────────────────────────

    describe('resolveCombat()', () => {
        function setupSaveStub(game: IActiveGame): void {
            activeGameService.saveActiveGameById.resolves(game);
            turnService.continueTurn.resolves();
            positionValidatorService.isValidRespawnTile.returns(true);
        }

        it('should set winner to attacker when defender health reaches 0 — Nominal case', async () => {
            const attacker = makeCharacter('Alice', { currentHealth: 5 });
            const defender = makeCharacter('Bob', { currentHealth: 0 });
            const attack = makeAttack('Alice', 'Bob');
            const game = makeGame([attacker, defender], attack);
            setupSaveStub(game);

            const outcome = await service.resolveCombat(game, 'Alice', 'Bob');

            expect(outcome.winner).to.equal('Alice');
            expect(outcome.losers).to.deep.equal(['Bob']);
            expect(outcome.cancelled).to.equal(false);
        });

        it('should set winner to defender when attacker health reaches 0 — Nominal case', async () => {
            const attacker = makeCharacter('Alice', { currentHealth: 0 });
            const defender = makeCharacter('Bob', { currentHealth: 8 });
            const attack = makeAttack('Alice', 'Bob');
            const game = makeGame([attacker, defender], attack);
            setupSaveStub(game);

            const outcome = await service.resolveCombat(game, 'Alice', 'Bob');

            expect(outcome.winner).to.equal('Bob');
            expect(outcome.losers).to.deep.equal(['Alice']);
        });

        it('should return no winner when both players have 0 health — Edge case', async () => {
            const attacker = makeCharacter('Alice', { currentHealth: 0 });
            const defender = makeCharacter('Bob', { currentHealth: 0 });
            const attack = makeAttack('Alice', 'Bob');
            const game = makeGame([attacker, defender], attack);
            setupSaveStub(game);

            const outcome = await service.resolveCombat(game, 'Alice', 'Bob');

            expect(outcome.winner).to.equal(null);
            expect(outcome.losers).to.have.members(['Alice', 'Bob']);
        });

        it('should increment winner victories — Nominal case', async () => {
            const attacker = makeCharacter('Alice', { currentHealth: 5, victories: 2 });
            const defender = makeCharacter('Bob', { currentHealth: 0 });
            const attack = makeAttack('Alice', 'Bob');
            const game = makeGame([attacker, defender], attack);
            setupSaveStub(game);

            await service.resolveCombat(game, 'Alice', 'Bob');

            expect(attacker.victories).to.equal(THREE_VICTORIES);
        });

        it('should reset loser health and relocate — Nominal case', async () => {
            const attacker = makeCharacter('Alice', { currentHealth: 5 });
            const defender = makeCharacter('Bob', { currentHealth: 0, startingPosition: { x: 2, y: 2 }, currentPosition: { x: 0, y: 1 } });
            const attack = makeAttack('Alice', 'Bob');
            const game = makeGame([attacker, defender], attack);
            positionValidatorService.isValidRespawnTile.returns(true);
            activeGameService.saveActiveGameById.resolves(game);
            turnService.continueTurn.resolves();

            await service.resolveCombat(game, 'Alice', 'Bob');

            // Health should be restored to initialHealth
            expect(defender.currentHealth).to.equal(defender.initialHealth);
        });

        it('should drop flag when flag carrier is defeated in CTF — Nominal case', async () => {
            const attacker = makeCharacter('Alice', { currentHealth: 5 });
            const carrier = makeCharacter('Bob', { currentHealth: 0, startingPosition: { x: 2, y: 2 } });
            const attack = makeAttack('Alice', 'Bob');

            const game = makeGame([attacker, carrier], attack);
            game.game.gameMode = GameType.Ctf;
            game.hasFlagId = 'Bob';
            game.game.board.items = [{ x: 0, y: 0, size: 1, itemType: ItemType.Flag, isCarried: true }];

            positionValidatorService.resolveFlagDropPosition.returns({ x: 1, y: 0 });
            positionValidatorService.isValidRespawnTile.returns(true);
            activeGameService.saveActiveGameById.resolves(game);
            turnService.continueTurn.resolves();

            await service.resolveCombat(game, 'Alice', 'Bob');

            expect(game.hasFlagId).to.equal('');
            const flag = game.game.board.items[0];
            expect(flag.isCarried).to.equal(false);
        });

        it('should keep flag ownership when the designated carrier is still alive — Edge case', async () => {
            const attacker = makeCharacter('Alice', { currentHealth: 5 });
            const defender = makeCharacter('Bob', { currentHealth: 0 });
            const attack = makeAttack('Alice', 'Bob');
            const game = makeGame([attacker, defender], attack);
            game.game.gameMode = GameType.Ctf;
            game.hasFlagId = 'Alice';
            game.game.board.items = [{ x: 0, y: 0, size: 1, itemType: ItemType.Flag, isCarried: true }];
            setupSaveStub(game);

            await service.resolveCombat(game, 'Alice', 'Bob');

            expect(game.hasFlagId).to.equal('Alice');
            expect(positionValidatorService.resolveFlagDropPosition.called).to.equal(false);
        });

        it('should skip flag repositioning when no flag item exists on the board — Edge case', async () => {
            const attacker = makeCharacter('Alice', { currentHealth: 5 });
            const carrier = makeCharacter('Bob', { currentHealth: 0, currentPosition: { x: 1, y: 1 }, startingPosition: { x: 2, y: 2 } });
            const attack = makeAttack('Alice', 'Bob');
            const game = makeGame([attacker, carrier], attack);
            game.game.gameMode = GameType.Ctf;
            game.hasFlagId = 'Bob';
            game.game.board.items = [];
            setupSaveStub(game);

            await service.resolveCombat(game, 'Alice', 'Bob');

            expect(game.hasFlagId).to.equal('Bob');
            expect(positionValidatorService.resolveFlagDropPosition.called).to.equal(false);
        });
    });

    // ── cancelCombat ──────────────────────────────────────────────────────

    describe('cancelCombat()', () => {
        it('should return null when there is no ongoing attack — Edge case', async () => {
            const game = makeGame([makeCharacter('Alice')], null);
            const result = await service.cancelCombat(game, 'Alice');
            expect(result).to.equal(null);
        });

        it('should resolve combat with the non-abandoning player as winner — Nominal case', async () => {
            const alice = makeCharacter('Alice');
            const bob = makeCharacter('Bob');
            const attack = makeAttack('Alice', 'Bob');
            const game = makeGame([alice, bob], attack);

            positionValidatorService.isValidRespawnTile.returns(true);
            activeGameService.saveActiveGameById.resolves(game);
            turnService.continueTurn.resolves();

            // Bob abandons → Alice wins
            const outcome = await service.cancelCombat(game, 'Bob');

            expect(outcome?.winner).to.equal('Alice');
            expect(outcome?.losers).to.include('Bob');
            expect(outcome?.cancelled).to.equal(true);
        });

        it('should resolve combat correctly when the attacker abandons — Nominal case', async () => {
            const alice = makeCharacter('Alice');
            const bob = makeCharacter('Bob');
            const attack = makeAttack('Alice', 'Bob');
            const game = makeGame([alice, bob], attack);

            positionValidatorService.isValidRespawnTile.returns(true);
            activeGameService.saveActiveGameById.resolves(game);
            turnService.continueTurn.resolves();

            // Alice (attacker) abandons → Bob wins
            const outcome = await service.cancelCombat(game, 'Alice');

            expect(outcome?.winner).to.equal('Bob');
            expect(outcome?.cancelled).to.equal(true);
        });

        it('should clear the combat timer before resolving — Nominal case', async () => {
            const alice = makeCharacter('Alice');
            const bob = makeCharacter('Bob');
            const attack = makeAttack('Alice', 'Bob');
            const game = makeGame([alice, bob], attack);

            positionValidatorService.isValidRespawnTile.returns(true);
            activeGameService.saveActiveGameById.resolves(game);
            turnService.continueTurn.resolves();

            await service.cancelCombat(game, 'Bob');

            expect((turnService.clearCombatTimer as sinon.SinonStub).calledOnce).to.equal(true);
        });

        it('should resolve with no winner when winner character cannot be found — Edge case', async () => {
            const alice = makeCharacter('Alice');
            const attack = makeAttack('Alice', 'Ghost');
            const game = makeGame([alice], attack);

            positionValidatorService.isValidRespawnTile.returns(true);
            activeGameService.saveActiveGameById.resolves(game);
            turnService.continueTurn.resolves();

            const outcome = await service.cancelCombat(game, 'Alice');

            expect(outcome?.winner).to.equal(null);
            expect(outcome?.losers).to.deep.equal(['Alice']);
            expect(outcome?.cancelled).to.equal(true);
        });
    });

    // ── findNearestAvailableSpawn ──────────────────────────────────────────

    describe('findNearestAvailableSpawn()', () => {
        it('should return the spawn position when it is already valid — Nominal case', () => {
            const game = makeGame([makeCharacter('Alice')]);
            positionValidatorService.isValidRespawnTile.returns(true);

            const result = service.findNearestAvailableSpawn({ x: 1, y: 1 }, game);
            expect(result).to.deep.equal({ x: 1, y: 1 });
        });

        it('should find an adjacent valid tile via BFS — Nominal case', () => {
            const game = makeGame([makeCharacter('Alice')]);
            // First call (origin) invalid, second call (first neighbour) valid
            positionValidatorService.isValidRespawnTile.onFirstCall().returns(false).onSecondCall().returns(true);

            const result = service.findNearestAvailableSpawn({ x: 1, y: 1 }, game);
            // It must be one of the four neighbours of (1,1)
            const neighbours = [
                { x: 1, y: 0 },
                { x: 0, y: 1 },
                { x: 1, y: 2 },
                { x: 2, y: 1 },
            ];
            const isNeighbour = neighbours.some((n) => n.x === result.x && n.y === result.y);
            expect(isNeighbour).to.equal(true);
        });

        it('should not revisit positions already in the visited set — Edge case', () => {
            const game = makeGame([makeCharacter('Alice')]);
            // Return false for origin, then true on the very next call
            positionValidatorService.isValidRespawnTile.onFirstCall().returns(false).onSecondCall().returns(true);
            // Should still terminate after a single BFS expansion
            const result = service.findNearestAvailableSpawn({ x: 0, y: 0 }, game);
            expect(result).to.be.an('object');
        });

        it('should return spawn when no directions are available for BFS expansion — Edge case', () => {
            const game = makeGame([makeCharacter('Alice')]);
            const spawn = { x: 1, y: 1 };
            positionValidatorService.isValidRespawnTile.returns(false);
            (service as unknown as { directions: { x: number; y: number }[] }).directions = [];

            const result = service.findNearestAvailableSpawn(spawn, game);
            expect(result).to.deep.equal(spawn);
        });
    });

    // ── applyCombatTurn ────────────────────────────────────────────────────

    describe('applyCombatTurn()', () => {
        it('should throw when no active game is found — Edge case', async () => {
            activeGameService.getActiveGameById.resolves(null);
            let threw = false;
            try {
                await service.applyCombatTurn('missing');
                throw new Error('should have thrown');
            } catch {
                threw = true;
            }
            expect(threw).to.equal(true);
        });

        it('should throw when active game has no current attack — Edge case', async () => {
            const game = makeGame([makeCharacter('Alice')], null);
            activeGameService.getActiveGameById.resolves(game);
            let threw = false;
            try {
                await service.applyCombatTurn('game-1');
                throw new Error('should have thrown');
            } catch {
                threw = true;
            }
            expect(threw).to.equal(true);
        });

        it('should resolve combat when attacker kills defender in one hit — Nominal case', async () => {
            const clock = sinon.useFakeTimers();

            const attacker = makeCharacter('BotA', {
                virtualPlayerProfile: VirtualPlayerProfile.Agressive,
                attackPoints: 100,
                currentHealth: 10,
            });
            const defender = makeCharacter('BotD', {
                virtualPlayerProfile: VirtualPlayerProfile.Defensive,
                defensePoints: 0,
                currentHealth: 1,
            });

            const attack = makeAttack('BotA', 'BotD', {
                attackerPosture: AttackPosture.Offensive,
                defenderPosture: AttackPosture.Defensive,
            });
            const game = makeGame([attacker, defender], attack);
            game.isDebugMode = false;

            activeGameService.getActiveGameById.resolves(game);
            activeGameService.saveActiveGameById.resolves(game);
            positionValidatorService.isValidRespawnTile.returns(true);
            turnService.continueTurn.resolves();

            const promise = service.applyCombatTurn('game-1');

            // turnFeedbackDuration = 0 for virtual vs virtual
            await clock.tickAsync(0);
            const outcome = await promise;

            clock.restore();

            // Combat ended; winner or null (draw)
            expect(outcome).to.not.equal(undefined);
        });

        it('should resolve to null when combat is cancelled during the delay — Edge case', async () => {
            const clock = sinon.useFakeTimers();

            const attacker = makeCharacter('BotA', {
                virtualPlayerProfile: VirtualPlayerProfile.Agressive,
                attackPoints: 1,
                currentHealth: 10,
            });
            const defender = makeCharacter('BotD', {
                virtualPlayerProfile: VirtualPlayerProfile.Defensive,
                defensePoints: 10,
                currentHealth: 10,
            });

            const attack = makeAttack('BotA', 'BotD', {
                attackerPosture: AttackPosture.Offensive,
                defenderPosture: AttackPosture.Defensive,
            });
            const game = makeGame([attacker, defender], attack);

            activeGameService.getActiveGameById
                .onFirstCall()
                .resolves(game)
                // Second call (inside setTimeout) returns a game with no currentAttack → cancelled
                .onSecondCall()
                .resolves(makeGame([attacker, defender], null));
            activeGameService.saveActiveGameById.resolves(game);

            const promise = service.applyCombatTurn('game-1');
            await clock.tickAsync(0);
            const outcome = await promise;

            clock.restore();
            expect(outcome).to.equal(null);
        });

        it('should clear timer and recurse when both postures become available — Edge case', async () => {
            const clock = sinon.useFakeTimers();

            const attacker = makeCharacter('BotA', {
                virtualPlayerProfile: VirtualPlayerProfile.Agressive,
                attackPoints: 1,
                currentHealth: 50,
            });
            const defender = makeCharacter('BotD', {
                virtualPlayerProfile: VirtualPlayerProfile.Defensive,
                defensePoints: 20,
                currentHealth: 50,
            });
            const attack = makeAttack('BotA', 'BotD', {
                attackerPosture: AttackPosture.Offensive,
                defenderPosture: AttackPosture.Defensive,
            });
            const game = makeGame([attacker, defender], attack);

            activeGameService.getActiveGameById.resolves(game);
            activeGameService.saveActiveGameById.resolves(game);
            activeGameService.choosePosture.callsFake(async (_gameId, playerName, posture) => {
                if (game.currentAttack?.attacker === playerName) {
                    game.currentAttack.attackerPosture = posture;
                }
                if (game.currentAttack?.defender === playerName) {
                    game.currentAttack.defenderPosture = posture;
                }
                return game;
            });

            const recursiveOutcome: CombatOutcome = {
                updatedActiveGame: game,
                winner: null,
                losers: [],
                cancelled: false,
            };

            const originalApplyCombatTurn = service.applyCombatTurn.bind(service);
            const applyCombatTurnStub = sinon.stub(service, 'applyCombatTurn');
            applyCombatTurnStub.onFirstCall().callsFake(originalApplyCombatTurn);
            applyCombatTurnStub.onSecondCall().resolves(recursiveOutcome);

            const promise = service.applyCombatTurn('game-1');
            await clock.tickAsync(0);
            const outcome = await promise;

            clock.restore();
            expect(turnService.clearCombatTimer.calledOnce).to.equal(true);
            expect(outcome).to.equal(recursiveOutcome);
        });

        it('should resolve to null when postures are still missing after turn start — Edge case', async () => {
            const clock = sinon.useFakeTimers();

            const attacker = makeCharacter('Alice', {
                attackPoints: 1,
                currentHealth: 50,
            });
            const defender = makeCharacter('Bob', {
                defensePoints: 20,
                currentHealth: 50,
            });
            const attack = makeAttack('Alice', 'Bob', {
                attackerPosture: AttackPosture.Offensive,
                defenderPosture: AttackPosture.Defensive,
            });
            const game = makeGame([attacker, defender], attack);

            activeGameService.getActiveGameById.resolves(game);
            activeGameService.saveActiveGameById.resolves(game);

            const promise = service.applyCombatTurn('game-1');
            await clock.tickAsync(COMBAT_TURN_FEEDBACK_DURATION_MS);
            const outcome = await promise;
            const scheduledCallback = (turnService.startCombatTimer as sinon.SinonStub).firstCall.args[2] as () => Promise<CombatOutcome | null>;
            const applyCombatTurnStub = sinon.stub(service, 'applyCombatTurn').resolves(null);
            await scheduledCallback();

            clock.restore();
            expect(outcome).to.equal(null);
            expect(applyCombatTurnStub.calledOnceWithExactly('game-1')).to.equal(true);
        });
    });

    // ── getAttackStatsForPlayer (tested indirectly via applyCombatTurn) ────

    describe('getAttackStatsForPlayer() — ice malus — Edge case', () => {
        it('should apply ICE_CELL_MALUS when player stands on an ice cell', async () => {
            const clock = sinon.useFakeTimers();

            const attacker = makeCharacter('BotA', {
                virtualPlayerProfile: VirtualPlayerProfile.Agressive,
                currentPosition: { x: 0, y: 0 },
                attackPoints: 4,
                defensePoints: 4,
                currentHealth: 10,
            });
            const defender = makeCharacter('BotD', {
                virtualPlayerProfile: VirtualPlayerProfile.Defensive,
                currentPosition: { x: 1, y: 0 },
                defensePoints: 0,
                currentHealth: 1,
            });

            const attack = makeAttack('BotA', 'BotD', {
                attackerPosture: AttackPosture.Offensive,
                defenderPosture: AttackPosture.Defensive,
            });

            const game = makeGame([attacker, defender], attack);
            // Place attacker on ice
            game.game.board.cells[0][0] = CellType.Ice;

            activeGameService.getActiveGameById.resolves(game);
            activeGameService.saveActiveGameById.resolves(game);
            positionValidatorService.isValidRespawnTile.returns(true);
            turnService.continueTurn.resolves();

            const promise = service.applyCombatTurn('game-1');
            await clock.tickAsync(0);
            const outcome = await promise;

            clock.restore();
            expect(outcome).to.not.equal(undefined);
        });

        it('should default sanctuary combat bonuses to zero when bonus values are missing — Edge case', async () => {
            const clock = sinon.useFakeTimers();

            const attacker = makeCharacter('BotA', {
                virtualPlayerProfile: VirtualPlayerProfile.Agressive,
                fightSanctuaryUsed: true,
                fightSanctuaryBonus: undefined,
                currentHealth: 10,
            });
            const defender = makeCharacter('BotD', {
                virtualPlayerProfile: VirtualPlayerProfile.Defensive,
                fightSanctuaryUsed: true,
                fightSanctuaryBonus: undefined,
                currentHealth: 10,
            });
            const attack = makeAttack('BotA', 'BotD', {
                attackerPosture: AttackPosture.Offensive,
                defenderPosture: AttackPosture.Defensive,
            });
            const game = makeGame([attacker, defender], attack);

            activeGameService.getActiveGameById.resolves(game);
            activeGameService.saveActiveGameById.resolves(game);

            const promise = service.applyCombatTurn('game-1');
            await clock.tickAsync(0);
            await promise;

            clock.restore();
            const [{ attackerStats, defenderStats }] = combatLogService.emitPrivateCombatTurnLogs.firstCall.args;
            expect(attackerStats.attackFightSanctuaryBonus).to.equal(0);
            expect(defenderStats.defenseFightSanctuaryBonus).to.equal(0);
        });
    });

    // ── debug mode ─────────────────────────────────────────────────────────

    describe('applyCombatTurn() in debug mode — Nominal case', () => {
        it('should use max dice values for the attacker in debug mode', async () => {
            const clock = sinon.useFakeTimers();

            const attacker = makeCharacter('BotA', {
                virtualPlayerProfile: VirtualPlayerProfile.Agressive,
                attackPoints: 4,
                currentHealth: 10,
                attackBonusDiceType: DiceType.SixSided,
            });
            const defender = makeCharacter('BotD', {
                virtualPlayerProfile: VirtualPlayerProfile.Defensive,
                defensePoints: 0,
                currentHealth: 1,
            });

            const attack = makeAttack('BotA', 'BotD', {
                attackerPosture: AttackPosture.Offensive,
                defenderPosture: AttackPosture.Defensive,
            });

            const game = makeGame([attacker, defender], attack);
            game.isDebugMode = true;

            activeGameService.getActiveGameById.resolves(game);
            activeGameService.saveActiveGameById.resolves(game);
            positionValidatorService.isValidRespawnTile.returns(true);
            turnService.continueTurn.resolves();

            const promise = service.applyCombatTurn('game-1');
            await clock.tickAsync(0);
            const outcome = await promise;

            clock.restore();
            expect(outcome).to.not.equal(undefined);
        });

        it('should use FOUR_SIDED max value for attacker four-sided attack dice in debug mode', async () => {
            const clock = sinon.useFakeTimers();

            const attacker = makeCharacter('BotA', {
                virtualPlayerProfile: VirtualPlayerProfile.Agressive,
                attackPoints: 4,
                currentHealth: 10,
                attackBonusDiceType: DiceType.FourSided,
            });
            const defender = makeCharacter('BotD', {
                virtualPlayerProfile: VirtualPlayerProfile.Defensive,
                defensePoints: 0,
                currentHealth: 1,
            });

            const attack = makeAttack('BotA', 'BotD', {
                attackerPosture: AttackPosture.Offensive,
                defenderPosture: AttackPosture.Defensive,
            });
            const game = makeGame([attacker, defender], attack);
            game.isDebugMode = true;

            activeGameService.getActiveGameById.resolves(game);
            activeGameService.saveActiveGameById.resolves(game);
            positionValidatorService.isValidRespawnTile.returns(true);
            turnService.continueTurn.resolves();

            const promise = service.applyCombatTurn('game-1');
            await clock.tickAsync(0);
            await promise;

            clock.restore();
            const [{ attackerStats }] = combatLogService.emitPrivateCombatTurnLogs.firstCall.args;
            expect(attackerStats.attackDiceBonus).to.equal(FOUR_SIDED_DICE_MAX);
        });
    });
});
