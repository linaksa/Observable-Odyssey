import { AgressivePlayerService } from '@app/services/virtual-player/agressive-player.service';
import { DefensivePlayerService } from '@app/services/virtual-player/defensive-player.service';
import { VirtualPlayerSanctuaryService } from '@app/services/virtual-player/virtual-player-sanctuary.service';
import { VirtualPlayerUtilitiesService } from '@app/services/virtual-player/virtual-player.utilities';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter, Team, VirtualPlayerProfile } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { expect } from 'chai';
import * as sinon from 'sinon';

describe('DefensivePlayerService', () => {
    let virtualPlayerUtilities: {
        moveToPositionOrNearest: sinon.SinonStub;
        moveAwayFromPlayers: sinon.SinonStub;
    };
    let aggressivePlayerService: {
        attackTargetIfPossible: sinon.SinonStub;
    };
    let sanctuaryService: { tryFallbackObjective: sinon.SinonStub };

    let service: DefensivePlayerService;

    beforeEach(() => {
        virtualPlayerUtilities = {
            moveToPositionOrNearest: sinon.stub().resolves(false),
            moveAwayFromPlayers: sinon.stub().resolves(),
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

    it('should try to block enemy carrier spawn and then attack if adjacent', async () => {
        const defender = createCharacter('Defender', Team.RED, VirtualPlayerProfile.Defensive);
        const enemyCarrier = createCharacter('EnemyCarrier', Team.BLUE);
        const game = createGame([defender, enemyCarrier], enemyCarrier.name);

        await service.play(defender, game);

        expect(virtualPlayerUtilities.moveToPositionOrNearest.calledOnceWithExactly(defender, game, enemyCarrier.startingPosition)).to.equal(true);
        expect(aggressivePlayerService.attackTargetIfPossible.calledOnceWithExactly(defender, game, enemyCarrier.name)).to.equal(true);
    });

    it('should still camp near spawn and only attack if enemy enters striking range', async () => {
        const defender = createCharacter('Defender', Team.RED, VirtualPlayerProfile.Defensive);
        const enemyCarrier = createCharacter('EnemyCarrier', Team.BLUE);
        const game = createGame([defender, enemyCarrier], enemyCarrier.name);

        virtualPlayerUtilities.moveToPositionOrNearest.resolves(false);

        await service.play(defender, game);

        expect(virtualPlayerUtilities.moveToPositionOrNearest.calledOnceWithExactly(defender, game, enemyCarrier.startingPosition)).to.equal(true);
        expect(aggressivePlayerService.attackTargetIfPossible.calledOnceWithExactly(defender, game, enemyCarrier.name)).to.equal(true);
    });
});

function createGame(players: ICharacter[], hasFlagId: string): IActiveGame {
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
                cells: [[CellType.Empty, CellType.Empty], [CellType.Empty, CellType.Empty]],
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
        hasFlagId,
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
