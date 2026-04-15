import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { ActionService } from '@app/services/gameplay/action-service';
import { CtfFlagActionService } from '@app/services/realtime/ctf-flag-action.service';
import { GameplayFlagDecisionService } from '@app/services/realtime/gameplay-flag-decision.service';
import { GameplayTurnEndService } from '@app/services/realtime/gameplay-turn-end.service';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Namespace } from 'socket.io';

describe('GameplayFlagDecisionService', () => {
    let service: GameplayFlagDecisionService;
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
    };
    let actionService: {
        takeFlag: sinon.SinonStub;
        giveFlag: sinon.SinonStub;
    };
    let ctfFlagActionService: {
        handleFlagAction: sinon.SinonStub;
    };
    let gameplayTurnEndService: {
        emitGameEndedIfNeeded: sinon.SinonStub;
    };
    let namespace: Namespace;
    let namespaceEmitStub: sinon.SinonStub;

    beforeEach(() => {
        activeGameService = {
            getActiveGameById: sinon.stub(),
        };
        actionService = {
            takeFlag: sinon.stub().resolves(),
            giveFlag: sinon.stub().resolves(),
        };
        ctfFlagActionService = {
            handleFlagAction: sinon.stub(),
        };
        gameplayTurnEndService = {
            emitGameEndedIfNeeded: sinon.stub().resolves(false),
        };
        namespaceEmitStub = sinon.stub();
        namespace = {
            to: sinon.stub().returns({ emit: namespaceEmitStub }),
        } as unknown as Namespace;

        service = new GameplayFlagDecisionService(
            activeGameService as unknown as ActiveGameService,
            actionService as unknown as ActionService,
            ctfFlagActionService as unknown as CtfFlagActionService,
            gameplayTurnEndService as unknown as GameplayTurnEndService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should broadcast rejection when the flag holder refuses the transfer', async () => {
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);
        ctfFlagActionService.handleFlagAction.callsFake(async (_activeGame, data, _namespace, callbacks) => {
            callbacks.setPendingFlagRequest(data.gameId, {
                requesterName: 'Alice',
                targetPlayerName: 'Bob',
                transferMode: 'take',
            });
            return true;
        });
        const emitGameLog = sinon.stub();

        await service.handleFlagAction({ gameId: activeGame._id, currentPlayerName: 'Alice', targetName: 'Bob' }, namespace, emitGameLog);
        await service.handleFlagTransferRejected({ gameId: activeGame._id, responderName: 'Bob' }, namespace, emitGameLog);

        expect(
            namespaceEmitStub.calledOnceWithExactly(SocketEvent.FlagTransferRejected, {
                gameId: activeGame._id,
                requesterName: 'Alice',
                targetPlayerName: 'Bob',
            }),
        ).to.equal(true);
        expect(emitGameLog.calledOnce).to.equal(true);
    });

    it('should ignore requester attempts to reject and keep the pending request active', async () => {
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);
        ctfFlagActionService.handleFlagAction.callsFake(async (_activeGame, data, _namespace, callbacks) => {
            callbacks.setPendingFlagRequest(data.gameId, {
                requesterName: 'Alice',
                targetPlayerName: 'Bob',
                transferMode: 'take',
            });
            return true;
        });
        const emitGameLog = sinon.stub();

        await service.handleFlagAction({ gameId: activeGame._id, currentPlayerName: 'Alice', targetName: 'Bob' }, namespace, emitGameLog);
        await service.handleFlagTransferRejected({ gameId: activeGame._id, responderName: 'Alice' }, namespace, emitGameLog);
        expect(namespaceEmitStub.called).to.equal(false);

        await service.handleFlagTransferRejected({ gameId: activeGame._id, responderName: 'Bob' }, namespace, emitGameLog);
        expect(namespaceEmitStub.calledOnce).to.equal(true);
    });

    it('should clear pending transfer when requester turn already ended', async () => {
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);
        ctfFlagActionService.handleFlagAction.callsFake(async (_activeGame, data, _namespace, callbacks) => {
            callbacks.setPendingFlagRequest(data.gameId, {
                requesterName: 'Alice',
                targetPlayerName: 'Bob',
                transferMode: 'take',
            });
            return true;
        });
        const emitGameLog = sinon.stub();

        await service.handleFlagAction({ gameId: activeGame._id, currentPlayerName: 'Alice', targetName: 'Bob' }, namespace, emitGameLog);

        activeGame.currentPlayerIndex = 1;
        await service.handleFlagTaken({ gameId: activeGame._id, newFlagCarrierName: 'Alice' }, namespace, emitGameLog);
        expect(actionService.takeFlag.called).to.equal(false);

        activeGame.currentPlayerIndex = 0;
        await service.handleFlagTransferRejected({ gameId: activeGame._id, responderName: 'Bob' }, namespace, emitGameLog);
        expect(namespaceEmitStub.called).to.equal(false);
    });

    it('should broadcast rejection when the recipient refuses a give transfer', async () => {
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);
        ctfFlagActionService.handleFlagAction.callsFake(async (_activeGame, data, _namespace, callbacks) => {
            callbacks.setPendingFlagRequest(data.gameId, {
                requesterName: 'Alice',
                targetPlayerName: 'Bob',
                transferMode: 'give',
            });
            return true;
        });
        const emitGameLog = sinon.stub();

        await service.handleFlagAction({ gameId: activeGame._id, currentPlayerName: 'Alice', targetName: 'Bob' }, namespace, emitGameLog);
        await service.handleFlagTransferRejected({ gameId: activeGame._id, responderName: 'Bob' }, namespace, emitGameLog);

        expect(
            namespaceEmitStub.calledOnceWithExactly(SocketEvent.FlagTransferRejected, {
                gameId: activeGame._id,
                requesterName: 'Alice',
                targetPlayerName: 'Bob',
            }),
        ).to.equal(true);
        expect(emitGameLog.calledOnce).to.equal(true);
    });
});

function createActiveGame(): IActiveGame {
    return {
        _id: 'game-1',
        game: {
            gameTitle: 'ctf',
            description: '',
            gameMode: GameType.Ctf,
            dateCreated: new Date('2026-01-01T00:00:00.000Z'),
            lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
            visibility: Visibility.Hidden,
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
        hasFlagId: 'Bob',
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
