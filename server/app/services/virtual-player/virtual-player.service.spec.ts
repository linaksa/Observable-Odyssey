/**
 * Testing strategy — VirtualPlayerService turn orchestration
 *
 * Approach:
 * - Replace aggressive, defensive, CTF objective, and finalizer collaborators with stubs.
 * - Drive startTurn() with profile/objective combinations to verify routing and short-circuit behavior.
 * - Assert beginTurn/finalizeTurn/finishTurn lifecycle calls around each execution path.
 *
 * Edge cases covered:
 * - Handled CTF objective skips both profile-specific play services.
 * - finishTurn() still executes when delegated play throws.
 */
import { AgressivePlayerService } from '@app/services/virtual-player/agressive-player.service';
import { CtfObjectiveService } from '@app/services/virtual-player/ctf-objective.service';
import { DefensivePlayerService } from '@app/services/virtual-player/defensive-player.service';
import { VirtualPlayerTurnFinalizerService } from '@app/services/virtual-player/virtual-player-turn-finalizer.service';
import { VirtualPlayerService } from '@app/services/virtual-player/virtual-player.service';
import { VirtualPlayerProfile } from '@common/character';
import { expect } from 'chai';
import * as sinon from 'sinon';

const makeCharacter = (profile: VirtualPlayerProfile) => ({
    name: 'Bot',
    virtualPlayerProfile: profile,
});

const makeGame = () => ({
    _id: 'g1',
    players: [] as never[],
    turnOrder: [] as string[],
    currentPlayerIndex: 0,
    isFinished: false,
});

describe('VirtualPlayerService', () => {
    let service: VirtualPlayerService;
    let aggressiveService: { play: sinon.SinonStub };
    let defensiveService: { play: sinon.SinonStub };
    let ctfObjectiveService: { handleTurnObjective: sinon.SinonStub };
    let finalizerService: {
        beginTurn: sinon.SinonStub;
        finalizeTurn: sinon.SinonStub;
        finishTurn: sinon.SinonStub;
    };

    beforeEach(() => {
        aggressiveService = { play: sinon.stub().resolves() };
        defensiveService = { play: sinon.stub().resolves() };
        ctfObjectiveService = { handleTurnObjective: sinon.stub().resolves(false) };
        finalizerService = {
            beginTurn: sinon.stub(),
            finalizeTurn: sinon.stub().resolves(),
            finishTurn: sinon.stub(),
        };

        service = new VirtualPlayerService(
            aggressiveService as unknown as AgressivePlayerService,
            defensiveService as unknown as DefensivePlayerService,
            ctfObjectiveService as unknown as CtfObjectiveService,
            finalizerService as unknown as VirtualPlayerTurnFinalizerService,
        );
    });

    afterEach(() => sinon.restore());

    it('calls aggressive player play for Agressive profile — Nominal case', async () => {
        const character = makeCharacter(VirtualPlayerProfile.Agressive);

        await service.startTurn(character as never, makeGame() as never);

        expect(aggressiveService.play.calledOnce).to.equal(true);
        expect(defensiveService.play.called).to.equal(false);
        expect(finalizerService.beginTurn.calledOnce).to.equal(true);
        expect(finalizerService.finalizeTurn.calledOnce).to.equal(true);
        expect(finalizerService.finishTurn.calledOnce).to.equal(true);
    });

    it('calls defensive player play for Defensive profile — Nominal case', async () => {
        const character = makeCharacter(VirtualPlayerProfile.Defensive);

        await service.startTurn(character as never, makeGame() as never);

        expect(defensiveService.play.calledOnce).to.equal(true);
        expect(aggressiveService.play.called).to.equal(false);
    });

    it('skips profile play when CTF objective is handled — Nominal case', async () => {
        ctfObjectiveService.handleTurnObjective.resolves(true);
        const character = makeCharacter(VirtualPlayerProfile.Agressive);

        await service.startTurn(character as never, makeGame() as never);

        expect(aggressiveService.play.called).to.equal(false);
        expect(defensiveService.play.called).to.equal(false);
        expect(finalizerService.finalizeTurn.calledOnce).to.equal(true);
    });

    it('always calls finishTurn even when play throws — Edge case', async () => {
        aggressiveService.play.rejects(new Error('boom'));
        const character = makeCharacter(VirtualPlayerProfile.Agressive);

        // Edge case: cleanup must run even when the delegated play path fails.
        let threw = false;
        try {
            await service.startTurn(character as never, makeGame() as never);
        } catch {
            threw = true;
        }

        expect(threw).to.equal(true);
        expect(finalizerService.finishTurn.calledOnce).to.equal(true);
    });
});
