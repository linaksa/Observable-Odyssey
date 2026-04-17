/* eslint-disable max-lines -- GameplayCombatFlowService requires extensive async combat/posture/timer branch coverage in one file. */
/**
 * Testing strategy — GameplayCombatFlowService
 *
 * Approach:
 * - Drive canUseAction, combatManager, and posture-selection paths with deterministic stubs.
 * - Assert combat socket events, timer interactions, and turn-ending behavior for human/virtual attackers.
 *
 * Edge cases covered:
 * - Action-denied flows emit errors and tolerate null sockets without throwing.
 * - NoOngoingAttack branches are swallowed while unexpected errors are re-thrown.
 * - Missing refreshed games short-circuit scheduled combat and post-combat processing.
 */
import { AppError } from '@app/error-types/app-error';
import { ActionService } from '@app/services/gameplay/action-service';
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { GameplayTurnEndService } from '@app/services/realtime/gameplay-turn-end.service';
import { VirtualPlayerTurnFinalizerService } from '@app/services/virtual-player/virtual-player-turn-finalizer.service';
import { GameplayCombatFlowService } from '@app/services/realtime/gameplay-combat-flow.service';
import { AttackPosture } from '@common/attack-result';
import { VirtualPlayerProfile } from '@common/character';
import { ErrorCode } from '@common/error-codes';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Namespace, Socket } from 'socket.io';
import { StatusCodes } from 'http-status-codes';

const makeActiveGame = (id = 'g1') => ({
    _id: id,
    turnOrder: ['Alice', 'Bob'],
    currentPlayerIndex: 0,
    isFinished: false,
    currentAttack: { attacker: 'Alice', defender: 'Bob' } as null | {
        attacker: string;
        defender: string;
        attackerPosture?: AttackPosture;
        defenderPosture?: AttackPosture;
    },
    players: [
        {
            name: 'Alice',
            hasAbandoned: false,
            virtualPlayerProfile: undefined as VirtualPlayerProfile | undefined,
        },
        {
            name: 'Bob',
            hasAbandoned: false,
            virtualPlayerProfile: undefined as VirtualPlayerProfile | undefined,
        },
    ],
});

describe('GameplayCombatFlowService', () => {
    let service: GameplayCombatFlowService;
    let actionService: {
        canUseAction: sinon.SinonStub;
        applyCombatTurn: sinon.SinonStub;
        autoChooseVirtualPostures: sinon.SinonStub;
        combatTurnCanBeApplied: sinon.SinonStub;
    };
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
        startCombat: sinon.SinonStub;
        choosePosture: sinon.SinonStub;
    };
    let turnService: {
        suspendTurn: sinon.SinonStub;
        startCombatTimer: sinon.SinonStub;
        clearCombatTimer: sinon.SinonStub;
        endTurn: sinon.SinonStub;
    };
    let turnEndService: {
        emitGameEndedIfNeeded: sinon.SinonStub;
        checkEndTurnIfNoMovesLeft: sinon.SinonStub;
    };
    let finalizerService: { isTurnInProgress: sinon.SinonStub };
    let socket: { emit: sinon.SinonStub };
    let namespace: { to: sinon.SinonStub };
    let namespaceEmit: sinon.SinonStub;
    let emitGameLog: sinon.SinonStub;

    beforeEach(() => {
        actionService = {
            canUseAction: sinon.stub().resolves(true),
            applyCombatTurn: sinon.stub().resolves(null),
            autoChooseVirtualPostures: sinon.stub().resolves(),
            combatTurnCanBeApplied: sinon.stub().resolves(false),
        };
        activeGameService = {
            getActiveGameById: sinon.stub().resolves(makeActiveGame()),
            startCombat: sinon.stub().resolves({ attacker: 'Alice', defender: 'Bob' }),
            choosePosture: sinon.stub().resolves(makeActiveGame()),
        };
        turnService = {
            suspendTurn: sinon.stub().resolves(),
            startCombatTimer: sinon.stub(),
            clearCombatTimer: sinon.stub(),
            endTurn: sinon.stub().resolves(),
        };
        turnEndService = {
            emitGameEndedIfNeeded: sinon.stub().resolves(false),
            checkEndTurnIfNoMovesLeft: sinon.stub().resolves(),
        };
        finalizerService = { isTurnInProgress: sinon.stub().returns(false) };
        socket = { emit: sinon.stub() };
        namespaceEmit = sinon.stub();
        namespace = { to: sinon.stub().returns({ emit: namespaceEmit }) };
        emitGameLog = sinon.stub();

        service = new GameplayCombatFlowService(
            actionService as unknown as ActionService,
            activeGameService as unknown as ActiveGameService,
            turnService as unknown as TurnService,
            turnEndService as unknown as GameplayTurnEndService,
            finalizerService as unknown as VirtualPlayerTurnFinalizerService,
        );
    });

    afterEach(() => sinon.restore());

    // canUseAction delegation scenarios.

    it('delegates canUseAction to actionService — Nominal case', async () => {
        actionService.canUseAction.resolves(false);
        const result = await service.canUseAction('g1', 'Alice', 'Bob');
        expect(result).to.equal(false);
        expect(actionService.canUseAction.calledOnceWithExactly('g1', 'Alice', 'Bob')).to.equal(true);
    });

    // combatManager scenarios.

    it('emits ActionError when action is not allowed — Edge case', async () => {
        actionService.canUseAction.resolves(false);

        await service.combatManager('g1', 'Alice', 'Bob', socket as unknown as Socket, {
            namespace: namespace as unknown as Namespace,
            emitGameLog,
        });

        expect(socket.emit.calledOnceWithExactly(SocketEvent.ActionError, { errorCodes: [ErrorCode.ActionNotAllowed] })).to.equal(true);
        expect(activeGameService.startCombat.called).to.equal(false);
    });

    it('does not throw when socket is null and action is not allowed — Edge case', async () => {
        actionService.canUseAction.resolves(false);

        await service.combatManager('g1', 'Alice', 'Bob', null, {
            namespace: namespace as unknown as Namespace,
            emitGameLog,
        });
        // No assertion needed: this verifies null sockets are tolerated on rejection paths.
    });

    it('starts combat, suspends turn, emits CombatStarted and CombatTurnStart — Nominal case', async () => {
        const combatResult = { attacker: 'Alice', defender: 'Bob' };
        activeGameService.startCombat.resolves(combatResult);

        await service.combatManager('g1', 'Alice', 'Bob', socket as unknown as Socket, {
            namespace: namespace as unknown as Namespace,
            emitGameLog,
        });

        expect(turnService.suspendTurn.calledOnceWithExactly('g1')).to.equal(true);
        expect(namespaceEmit.calledWithExactly(SocketEvent.CombatStarted, combatResult)).to.equal(true);
        expect(namespaceEmit.calledWithExactly(SocketEvent.CombatTurnStart, combatResult)).to.equal(true);
    });

    it('immediately applies combat turn when combatTurnCanBeApplied is true — Nominal case', async () => {
        actionService.combatTurnCanBeApplied.resolves(true);
        actionService.applyCombatTurn.resolves(null);

        await service.combatManager('g1', 'Alice', 'Bob', socket as unknown as Socket, {
            namespace: namespace as unknown as Namespace,
            emitGameLog,
        });

        expect(turnService.clearCombatTimer.called).to.equal(true);
        expect(actionService.applyCombatTurn.called).to.equal(true);
    });

    it('ends turn for attacker-loser after combat — Nominal case', async () => {
        actionService.combatTurnCanBeApplied.resolves(true);
        actionService.applyCombatTurn.resolves({ losers: ['Alice'], winners: ['Bob'] });

        await service.combatManager('g1', 'Alice', 'Bob', socket as unknown as Socket, {
            namespace: namespace as unknown as Namespace,
            emitGameLog,
        });

        expect(turnService.endTurn.called).to.equal(true);
    });

    it('checks end-turn for surviving human attacker after winning combat — Nominal case', async () => {
        actionService.combatTurnCanBeApplied.resolves(true);
        actionService.applyCombatTurn.resolves({ losers: ['Bob'], winners: ['Alice'] });

        await service.combatManager('g1', 'Alice', 'Bob', socket as unknown as Socket, {
            namespace: namespace as unknown as Namespace,
            emitGameLog,
        });

        expect(turnEndService.checkEndTurnIfNoMovesLeft.called).to.equal(true);
    });

    it('ends turn for surviving virtual attacker after winning combat — Nominal case', async () => {
        actionService.combatTurnCanBeApplied.resolves(true);
        actionService.applyCombatTurn.resolves({ losers: ['Bob'], winners: ['Alice'] });
        const game = makeActiveGame();
        game.players[0].virtualPlayerProfile = 'aggressive' as never;
        activeGameService.getActiveGameById.resolves(game);
        finalizerService.isTurnInProgress.returns(false);

        await service.combatManager('g1', 'Alice', 'Bob', socket as unknown as Socket, {
            namespace: namespace as unknown as Namespace,
            emitGameLog,
        });

        expect(turnService.endTurn.called).to.equal(true);
    });

    it('skips endTurn for virtual attacker when turn is still in progress — Edge case', async () => {
        actionService.combatTurnCanBeApplied.resolves(true);
        actionService.applyCombatTurn.resolves({ losers: ['Bob'], winners: ['Alice'] });
        const game = makeActiveGame();
        game.players[0].virtualPlayerProfile = 'aggressive' as never;
        activeGameService.getActiveGameById.resolves(game);
        finalizerService.isTurnInProgress.returns(true);

        await service.combatManager('g1', 'Alice', 'Bob', socket as unknown as Socket, {
            namespace: namespace as unknown as Namespace,
            emitGameLog,
        });

        expect(turnService.endTurn.called).to.equal(false);
    });

    // handleChooseAttackPosture scenarios.

    it('does nothing when choosePosture returns null (no ongoing attack) — Edge case', async () => {
        const noAttackError = new AppError([ErrorCode.NoOngoingAttack], StatusCodes.BAD_REQUEST);
        activeGameService.choosePosture.rejects(noAttackError);

        await service.handleChooseAttackPosture(
            { gameId: 'g1', playerName: 'Alice', posture: AttackPosture.Offensive },
            namespace as unknown as Namespace,
        );

        expect(actionService.applyCombatTurn.called).to.equal(false);
    });

    it('re-throws non-NoOngoingAttack errors from choosePosture — Edge case', async () => {
        activeGameService.choosePosture.rejects(new Error('unexpected'));

        let threw = false;
        try {
            await service.handleChooseAttackPosture(
                { gameId: 'g1', playerName: 'Alice', posture: AttackPosture.Offensive },
                namespace as unknown as Namespace,
            );
        } catch {
            threw = true;
        }
        expect(threw).to.equal(true);
    });

    it('does not apply combat turn when only one posture is set — Nominal case', async () => {
        const game = makeActiveGame();
        game.currentAttack = { attacker: 'Alice', defender: 'Bob', attackerPosture: AttackPosture.Offensive };
        activeGameService.getActiveGameById.resolves(game);
        activeGameService.choosePosture.resolves(game);

        await service.handleChooseAttackPosture(
            { gameId: 'g1', playerName: 'Alice', posture: AttackPosture.Offensive },
            namespace as unknown as Namespace,
        );

        expect(actionService.applyCombatTurn.called).to.equal(false);
    });

    it('applies combat turn when both postures are set — Nominal case', async () => {
        const game = makeActiveGame();
        game.currentAttack = {
            attacker: 'Alice',
            defender: 'Bob',
            attackerPosture: AttackPosture.Offensive,
            defenderPosture: AttackPosture.Defensive,
        };
        activeGameService.getActiveGameById.resolves(game);
        activeGameService.choosePosture.resolves(game);
        actionService.applyCombatTurn.resolves(null);

        await service.handleChooseAttackPosture(
            { gameId: 'g1', playerName: 'Alice', posture: AttackPosture.Offensive },
            namespace as unknown as Namespace,
        );

        expect(turnService.clearCombatTimer.called).to.equal(true);
        expect(actionService.applyCombatTurn.called).to.equal(true);
    });

    it('returns from scheduled combat turn when refreshed game is unavailable', async () => {
        let timerCallback: (() => Promise<void>) | undefined;
        turnService.startCombatTimer.callsFake((_duration, _activeGame, callback) => {
            timerCallback = callback;
        });
        activeGameService.getActiveGameById.onFirstCall().resolves(makeActiveGame());
        activeGameService.getActiveGameById.onSecondCall().resolves(null);

        await service.combatManager('g1', 'Alice', 'Bob', socket as unknown as Socket, {
            namespace: namespace as unknown as Namespace,
            emitGameLog,
        });
        await timerCallback?.();

        expect(actionService.applyCombatTurn.called).to.equal(false);
    });

    it('swallows NoOngoingAttack error in scheduled combat turn callback', async () => {
        let timerCallback: (() => Promise<void>) | undefined;
        turnService.startCombatTimer.callsFake((_duration, _activeGame, callback) => {
            timerCallback = callback;
        });
        activeGameService.getActiveGameById.onFirstCall().resolves(makeActiveGame());
        activeGameService.getActiveGameById.onSecondCall().resolves(makeActiveGame());
        actionService.applyCombatTurn.rejects(new AppError([ErrorCode.NoOngoingAttack], StatusCodes.BAD_REQUEST));

        await service.combatManager('g1', 'Alice', 'Bob', socket as unknown as Socket, {
            namespace: namespace as unknown as Namespace,
            emitGameLog,
        });
        await timerCallback?.();

        expect(actionService.applyCombatTurn.calledOnce).to.equal(true);
    });

    it('rethrows unexpected errors in scheduled combat turn callback', async () => {
        let timerCallback: (() => Promise<void>) | undefined;
        turnService.startCombatTimer.callsFake((_duration, _activeGame, callback) => {
            timerCallback = callback;
        });
        activeGameService.getActiveGameById.onFirstCall().resolves(makeActiveGame());
        activeGameService.getActiveGameById.onSecondCall().resolves(makeActiveGame());
        actionService.applyCombatTurn.rejects(new Error('unexpected-combat-error'));

        await service.combatManager('g1', 'Alice', 'Bob', socket as unknown as Socket, {
            namespace: namespace as unknown as Namespace,
            emitGameLog,
        });

        let threw = false;
        try {
            await timerCallback?.();
        } catch {
            threw = true;
        }
        expect(threw).to.equal(true);
    });

    it('does nothing when checking combat-ready posture and active game is missing', async () => {
        activeGameService.choosePosture.resolves(makeActiveGame());
        activeGameService.getActiveGameById.resolves(null);

        await service.handleChooseAttackPosture(
            { gameId: 'g1', playerName: 'Alice', posture: AttackPosture.Offensive },
            namespace as unknown as Namespace,
        );

        expect(actionService.applyCombatTurn.called).to.equal(false);
    });

    it('swallows NoOngoingAttack when applying ready combat from posture choice', async () => {
        const game = makeActiveGame();
        game.currentAttack = {
            attacker: 'Alice',
            defender: 'Bob',
            attackerPosture: AttackPosture.Offensive,
            defenderPosture: AttackPosture.Defensive,
        };
        activeGameService.choosePosture.resolves(game);
        activeGameService.getActiveGameById.resolves(game);
        actionService.applyCombatTurn.rejects(new AppError([ErrorCode.NoOngoingAttack], StatusCodes.BAD_REQUEST));

        await service.handleChooseAttackPosture(
            { gameId: 'g1', playerName: 'Alice', posture: AttackPosture.Offensive },
            namespace as unknown as Namespace,
        );

        expect(turnService.clearCombatTimer.called).to.equal(true);
    });

    it('rethrows unexpected applyCombatTurn errors after both postures are set', async () => {
        const game = makeActiveGame();
        game.currentAttack = {
            attacker: 'Alice',
            defender: 'Bob',
            attackerPosture: AttackPosture.Offensive,
            defenderPosture: AttackPosture.Defensive,
        };
        activeGameService.choosePosture.resolves(game);
        activeGameService.getActiveGameById.resolves(game);
        actionService.applyCombatTurn.rejects(new Error('apply failed'));

        let threw = false;
        try {
            await service.handleChooseAttackPosture(
                { gameId: 'g1', playerName: 'Alice', posture: AttackPosture.Offensive },
                namespace as unknown as Namespace,
            );
        } catch {
            threw = true;
        }

        expect(threw).to.equal(true);
    });

    it('handles post-combat scenario when both postures are set and outcome exists', async () => {
        const game = makeActiveGame();
        game.currentAttack = {
            attacker: 'Alice',
            defender: 'Bob',
            attackerPosture: AttackPosture.Offensive,
            defenderPosture: AttackPosture.Defensive,
        };
        activeGameService.choosePosture.resolves(game);
        activeGameService.getActiveGameById.resolves(game);
        actionService.applyCombatTurn.resolves({ losers: ['Bob'], winners: ['Alice'] });

        await service.handleChooseAttackPosture(
            { gameId: 'g1', playerName: 'Alice', posture: AttackPosture.Offensive },
            namespace as unknown as Namespace,
        );

        expect(turnEndService.checkEndTurnIfNoMovesLeft.calledOnceWithExactly('g1', 'Alice')).to.equal(true);
    });

    it('returns from post-combat handling when active game is missing', async () => {
        const privateService = service as unknown as {
            handlePostCombatEndScenario: (
                attackerName: string,
                gameId: string,
                combatOutcome: { losers: string[] },
                namespaceArg: Namespace,
            ) => Promise<void>;
        };
        activeGameService.getActiveGameById.resolves(null);

        await privateService.handlePostCombatEndScenario('Alice', 'g1', { losers: [] }, namespace as unknown as Namespace);

        expect(turnService.endTurn.called).to.equal(false);
    });
});
