import { CtfFlagActionService, type PendingFlagRequest } from '@app/services/realtime/ctf-flag-action.service';
import { ActionService } from '@app/services/gameplay/action-service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter, Team, VirtualPlayerProfile } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Namespace } from 'socket.io';

describe('CtfFlagActionService', () => {
    let actionService: {
        isOnSameTeam: sinon.SinonStub;
        canGiveFlag: sinon.SinonStub;
        canTakeFlag: sinon.SinonStub;
        flagActionRequest: sinon.SinonStub;
        giveFlag: sinon.SinonStub;
        takeFlag: sinon.SinonStub;
    };

    let service: CtfFlagActionService;
    let namespaceEmitStub: sinon.SinonStub;
    let namespace: Namespace;
    let pendingRequest: PendingFlagRequest | null;
    let pendingGameId: string | null;

    beforeEach(() => {
        actionService = {
            isOnSameTeam: sinon.stub().resolves(true),
            canGiveFlag: sinon.stub().resolves(false),
            canTakeFlag: sinon.stub().resolves(false),
            flagActionRequest: sinon.stub().resolves({
                gameId: 'game-ctf',
                currentPlayerName: 'A',
                currentPlayerActionsLeft: 0,
                targetPlayerName: 'B',
            }),
            giveFlag: sinon.stub().resolves(),
            takeFlag: sinon.stub().resolves(),
        };

        service = new CtfFlagActionService(actionService as unknown as ActionService);

        namespaceEmitStub = sinon.stub();
        namespace = {
            to: sinon.stub().returns({ emit: namespaceEmitStub }),
        } as unknown as Namespace;

        pendingRequest = null;
        pendingGameId = null;
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should auto-accept taking the flag from a virtual teammate', async () => {
        const requester = createCharacter('Requester', Team.RED);
        const virtualCarrier = createCharacter('VirtualCarrier', Team.RED, VirtualPlayerProfile.Defensive);
        const game = createActiveGame([requester, virtualCarrier]);

        actionService.canTakeFlag.resolves(true);
        const onFlagUpdated = sinon.stub().resolves();

        const handled = await service.handleFlagAction(
            game,
            { gameId: game._id, currentPlayerName: requester.name, targetName: virtualCarrier.name },
            namespace,
            {
                setPendingFlagRequest: (gameId, request) => {
                    pendingGameId = gameId;
                    pendingRequest = request;
                },
                onFlagUpdated,
            },
        );

        expect(handled).to.equal(true);
        expect(actionService.takeFlag.calledOnceWithExactly(game._id, requester.name)).to.equal(true);
        expect(
            namespaceEmitStub.calledWithExactly(SocketEvent.FlagPickedUp, {
                playerName: requester.name,
                requesterName: requester.name,
                requesterActionsLeft: 0,
            }),
        ).to.equal(true);
        expect(onFlagUpdated.calledOnceWithExactly(game._id)).to.equal(true);
        expect(namespaceEmitStub.calledWith(SocketEvent.TakeFlag)).to.equal(false);
        expect(pendingGameId).to.equal(null);
        expect(pendingRequest).to.equal(null);
    });

    it('should never create give requests when current virtual player has the flag', async () => {
        const virtualCarrier = createCharacter('VirtualCarrier', Team.BLUE, VirtualPlayerProfile.Agressive);
        const teammate = createCharacter('Teammate', Team.BLUE);
        const game = createActiveGame([virtualCarrier, teammate]);

        actionService.canGiveFlag.resolves(true);

        const handled = await service.handleFlagAction(
            game,
            { gameId: game._id, currentPlayerName: virtualCarrier.name, targetName: teammate.name },
            namespace,
            {
                setPendingFlagRequest: (gameId, request) => {
                    pendingGameId = gameId;
                    pendingRequest = request;
                },
            },
        );

        expect(handled).to.equal(true);
        expect(actionService.flagActionRequest.called).to.equal(false);
        expect(namespaceEmitStub.calledWith(SocketEvent.GiveFlag)).to.equal(false);
        expect(pendingGameId).to.equal(null);
        expect(pendingRequest).to.equal(null);
    });
});

function createActiveGame(players: ICharacter[]): IActiveGame {
    return {
        _id: 'game-ctf',
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

function createCharacter(name: string, team: Team, virtualPlayerProfile?: VirtualPlayerProfile): ICharacter {
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
        virtualPlayerProfile,
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}
