/**
 * Testing strategy — CombatLogService
 *
 * Approach:
 * - Validate emitted combat-log message content through public APIs and stubbed GameplayLogService calls.
 * - Assert ordering and formatting of title/exchange lines across attacker and defender sections.
 *
 * Edge cases covered:
 * - Signed stat formatting for positive, zero, and negative values in breakdown strings.
 * - Public room-log delegation path for non-private combat messages.
 */
import { CombatLogService } from '@app/services/gameplay/combat-log.service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { AttackPosture } from '@common/attack-result';
import { expect } from 'chai';
import * as sinon from 'sinon';

const COMBAT_TURN_NUMBER = 3;

describe('CombatLogService', () => {
    let combatLogService: CombatLogService;
    let gameplayLogService: {
        emitPrivateGameLogToPlayers: sinon.SinonStub;
        emitGameLogToRoom: sinon.SinonStub;
    };

    beforeEach(() => {
        gameplayLogService = {
            emitPrivateGameLogToPlayers: sinon.stub(),
            emitGameLogToRoom: sinon.stub(),
        };
        combatLogService = new CombatLogService(gameplayLogService as unknown as GameplayLogService);
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should emit combat turn logs with detailed exchange messages for both players', () => {
        // Nominal case: combat turn produces title + attacker exchange + defender exchange.
        combatLogService.emitPrivateCombatTurnLogs({
            gameId: 'g1',
            attackerName: 'Alice',
            defenderName: 'Bob',
            combatTurnNumber: COMBAT_TURN_NUMBER,
            attackerPosture: AttackPosture.Offensive,
            defenderPosture: AttackPosture.Defensive,
            attackerStats: {
                baseAttackPoints: 4,
                baseDefensePoints: 3,
                attackDiceBonus: 2,
                defenseDiceBonus: -1,
                postureAttackBonus: 1,
                postureDefenseBonus: 0,
                attackFightSanctuaryBonus: 0,
                defenseFightSanctuaryBonus: 1,
                attackIceMalus: -2,
                defenseIceMalus: 0,
                totalAttackPoints: 5,
                totalDefensePoints: 3,
            },
            defenderStats: {
                baseAttackPoints: 2,
                baseDefensePoints: 5,
                attackDiceBonus: 0,
                defenseDiceBonus: 3,
                postureAttackBonus: 0,
                postureDefenseBonus: 1,
                attackFightSanctuaryBonus: 2,
                defenseFightSanctuaryBonus: 0,
                attackIceMalus: -1,
                defenseIceMalus: -2,
                totalAttackPoints: 3,
                totalDefensePoints: 7,
            },
            attackerDealtDamage: 1,
            defenderDealtDamage: 0,
        });

        expect(gameplayLogService.emitPrivateGameLogToPlayers.callCount).to.equal(COMBAT_TURN_NUMBER);

        const [firstCall, secondCall, thirdCall] = gameplayLogService.emitPrivateGameLogToPlayers.getCalls();
        expect(firstCall.args).to.deep.equal(['g1', ['Alice', 'Bob'], `Tour de combat #${COMBAT_TURN_NUMBER}`]);

        expect(secondCall.args[2]).to.contain('--Alice attaque Bob--');
        expect(secondCall.args[2]).to.contain('Base=4 dé=+2 posture=+1 sanctuaire=+0 glace=-2 total=5');
        expect(secondCall.args[2]).to.contain('Différence: 5-7=-2');
        expect(secondCall.args[2]).to.contain('Dégâts effectivement infligés 1');

        // Edge case: second exchange includes negative and zero signed formatting.
        expect(thirdCall.args[2]).to.contain('--Bob attaque Alice--');
        expect(thirdCall.args[2]).to.contain('Base=2 dé=+0 posture=+0 sanctuaire=+2 glace=-1 total=3');
        expect(thirdCall.args[2]).to.contain('Base=3 dé=-1 posture=+0 sanctuaire=+1 glace=+0 total=3');
        expect(thirdCall.args[2]).to.contain('Différence: 3-3=0');
        expect(thirdCall.args[2]).to.contain('Dégâts effectivement infligés 0');
    });

    it('should delegate public logs to room broadcast service', () => {
        // Nominal case: public gameplay log is forwarded as-is.
        combatLogService.emitPublicGameLog('g2', 'Combat terminé.');

        expect(gameplayLogService.emitGameLogToRoom.calledOnceWithExactly('g2', 'Combat terminé.')).to.equal(true);
    });
});
