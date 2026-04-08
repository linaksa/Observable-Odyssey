import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { AgressivePlayerService } from '@app/services/virtual-player/agressive-player.service';
import { VirtualPlayerSanctuaryService } from '@app/services/virtual-player/virtual-player-sanctuary.service';
import { VirtualPlayerUtilitiesService } from '@app/services/virtual-player/virtual-player.utilities';
import { IActiveGame } from '@common/activeGame';
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
});

function createGame(players: ICharacter[]): IActiveGame {
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
        positionDepart: { x: 0, y: 0 },
        positionGrille: { x: 0, y: 0 },
        team,
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}
