/**
 * Testing strategy — GameplayActionService
 *
 * - Verify combat timers re-check live state before applying a delayed combat turn.
 * - Prevent stale combat callbacks from running after combat has already been cleared.
 */
import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { ActionService } from '@app/services/gameplay/action-service';
import { DoorService } from '@app/services/gameplay/door-service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { MovementService } from '@app/services/gameplay/movement-service';
import { SanctuaryService } from '@app/services/gameplay/sanctuary-service';
import { StartGameService } from '@app/services/gameplay/start-game.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { CtfFlagActionService } from '@app/services/realtime/ctf-flag-action.service';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { GameSessionService } from '@app/services/realtime/game-session.service';
import { VirtualPlayerTurnFinalizerService } from '@app/services/virtual-player/virtual-player-turn-finalizer.service';
import { IActiveGame, ICurrentAttack } from '@common/activeGame';
import { AttackPosture } from '@common/attackResult';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { Namespace } from 'socket.io';
import { expect } from 'chai';
import * as sinon from 'sinon';

describe('GameplayActionService', () => {
    let service: GameplayActionService;
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
        startCombat: sinon.SinonStub;
        saveActiveGameById: sinon.SinonStub;
    };
    let actionService: {
        canUseAction: sinon.SinonStub;
        applyCombatTurn: sinon.SinonStub;
    };
    let turnService: {
        suspendTurn: sinon.SinonStub;
        startCombatTimer: sinon.SinonStub;
        clearCombatTimer: sinon.SinonStub;
        endTurn: sinon.SinonStub;
    };
    let namespace: Namespace;
    let namespaceEmitStub: sinon.SinonStub;
    let combatTimerCallback: (() => Promise<void> | void) | undefined;

    beforeEach(() => {
        activeGameService = {
            getActiveGameById: sinon.stub(),
            startCombat: sinon.stub(),
            saveActiveGameById: sinon.stub().resolves(),
        };
        actionService = {
            canUseAction: sinon.stub().resolves(true),
            applyCombatTurn: sinon.stub().resolves(false),
        };
        turnService = {
            suspendTurn: sinon.stub(),
            startCombatTimer: sinon.stub().callsFake((_durationMs: number, _activeGame: IActiveGame, callback: () => Promise<void> | void) => {
                combatTimerCallback = callback;
            }),
            clearCombatTimer: sinon.stub(),
            endTurn: sinon.stub().resolves(),
        };
        namespaceEmitStub = sinon.stub();
        namespace = {
            to: sinon.stub().returns({ emit: namespaceEmitStub }),
        } as unknown as Namespace;

        service = new GameplayActionService(
            turnService as unknown as TurnService,
            {} as StartGameService,
            {} as MovementService,
            {} as DoorService,
            {} as SanctuaryService,
            {} as EndGameService,
            {} as GameSessionService,
            activeGameService as unknown as ActiveGameService,
            actionService as unknown as ActionService,
            {} as CtfFlagActionService,
            {} as VirtualPlayerTurnFinalizerService,
        );
    });

    afterEach(() => {
        sinon.restore();
        combatTimerCallback = undefined;
    });

    it('skips delayed combat resolution when the combat has already been cleared', async () => {
        const activeGame = createActiveGame(createCurrentAttack('Alice', 'Bob'));
        const refreshedGame = createActiveGame(null);
        activeGameService.startCombat.resolves(activeGame);
        activeGameService.getActiveGameById.onFirstCall().resolves(activeGame);
        activeGameService.getActiveGameById.onSecondCall().resolves(activeGame);
        activeGameService.getActiveGameById.onThirdCall().resolves(refreshedGame);

        await service.combatManager('game-1', 'Alice', 'Bob', null, namespace);

        expect(turnService.startCombatTimer.calledOnce).to.equal(true);
        expect(combatTimerCallback).to.be.a('function');

        await combatTimerCallback?.();

        expect(actionService.applyCombatTurn.called).to.equal(false);
    });
});

function createActiveGame(currentAttack: ICurrentAttack | null): IActiveGame {
    return {
        _id: 'game-1',
        game: {
            gameTitle: 'Arena',
            description: '',
            gameMode: GameType.Classic,
            dateCreated: new Date('2026-01-01T00:00:00.000Z'),
            lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
            visibility: Visibility.Viewable,
            board: {
                cells: [[CellType.Empty]],
                items: [],
            },
        },
        players: [createCharacter('Alice'), createCharacter('Bob')],
        currentPlayerIndex: 0,
        turnOrder: ['Alice', 'Bob'],
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Alice',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: '',
        turnStartTimeStamp: 0,
        currentAttack,
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

function createCurrentAttack(attacker: string, defender: string): ICurrentAttack {
    return {
        attacker,
        defender,
        turnCount: 1,
        suspendedTurnTimer: 3,
        attackerPosture: AttackPosture.Defensive,
        defenderPosture: AttackPosture.Offensive,
    };
}
