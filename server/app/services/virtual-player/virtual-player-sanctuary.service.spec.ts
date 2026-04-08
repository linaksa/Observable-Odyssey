import { MovementService } from '@app/services/gameplay/movement-service';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { VirtualPlayerSanctuaryService } from '@app/services/virtual-player/virtual-player-sanctuary.service';
import { VirtualPlayerUtilitiesService } from '@app/services/virtual-player/virtual-player.utilities';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter, Team } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { ItemType } from '@common/items';
import { Namespaces } from '@common/namespaces';
import { expect } from 'chai';
import * as sinon from 'sinon';

describe('VirtualPlayerSanctuaryService', () => {
    let movementService: { getReachablePositions: sinon.SinonStub };
    let virtualPlayerUtilities: { moveToPosition: sinon.SinonStub };
    let gameplayActionService: {
        handleSanctuaryInteraction: sinon.SinonStub;
        emitGameLogToRoom: sinon.SinonStub;
    };
    let socketService: { getNamespace: sinon.SinonStub };
    let service: VirtualPlayerSanctuaryService;

    beforeEach(() => {
        movementService = { getReachablePositions: sinon.stub().resolves([{ x: 0, y: 0 }]) };
        virtualPlayerUtilities = { moveToPosition: sinon.stub().resolves(true) };
        gameplayActionService = {
            handleSanctuaryInteraction: sinon.stub().resolves(),
            emitGameLogToRoom: sinon.stub(),
        };
        socketService = { getNamespace: sinon.stub().returns({ to: sinon.stub().returns({ emit: sinon.stub() }) }) };

        service = new VirtualPlayerSanctuaryService(
            movementService as unknown as MovementService,
            virtualPlayerUtilities as unknown as VirtualPlayerUtilitiesService,
            gameplayActionService as unknown as GameplayActionService,
            socketService as unknown as SocketService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should prioritize reachable life sanctuary when low health', async () => {
        const character = createCharacter('Bot');
        character.currentHealth = 2;

        const game = createGame([createSanctuary(ItemType.LifeSanctuary)]);
        movementService.getReachablePositions.resolves([{ x: 0, y: 1 }]);

        const handled = await service.tryFallbackObjective(character, game);

        expect(handled).to.equal(true);
        expect(gameplayActionService.handleSanctuaryInteraction.calledOnce).to.equal(true);
        expect(socketService.getNamespace.calledOnceWithExactly(Namespaces.Game)).to.equal(true);
    });

    it('should fallback to fight sanctuary when no life option is available', async () => {
        const character = createCharacter('Bot');
        character.currentHealth = 5;

        const game = createGame([createSanctuary(ItemType.FightSanctuary)]);
        movementService.getReachablePositions.resolves([{ x: 0, y: 1 }]);

        const handled = await service.tryFallbackObjective(character, game);

        expect(handled).to.equal(true);
        expect(gameplayActionService.handleSanctuaryInteraction.calledOnce).to.equal(true);
    });
});

function createGame(items: { x: number; y: number; size: number; itemType: ItemType; active?: boolean }[]): IActiveGame {
    return {
        _id: 'game-1',
        game: {
            gameTitle: 'ctf',
            description: '',
            gameMode: GameType.Classic,
            dateCreated: new Date('2026-01-01T00:00:00.000Z'),
            lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
            visibility: Visibility.Hidden,
            board: {
                cells: [
                    [CellType.Empty, CellType.Empty, CellType.Empty],
                    [CellType.Empty, CellType.Empty, CellType.Empty],
                    [CellType.Empty, CellType.Empty, CellType.Empty],
                ],
                items,
            },
        },
        players: [createCharacter('Bot')],
        currentPlayerIndex: 0,
        turnOrder: ['Bot'],
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Organizer',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: '',
        turnStartTimeStamp: 0,
        currentAttack: null,
    };
}

function createCharacter(name: string): ICharacter {
    return {
        name,
        avatar: Avatar.Avatar1,
        initialHealth: 6,
        currentHealth: 6,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints: 4,
        attackPoints: 4,
        defensePoints: 4,
        actionsLeft: 1,
        movementLeft: 3,
        victories: 0,
        hasAbandoned: false,
        startingPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        team: Team.RED,
        fightSanctuaryUsed: false,
        fightSanctuaryTurnsRemaining: 0,
        fightSanctuaryBonus: 0,
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}

function createSanctuary(itemType: ItemType.LifeSanctuary | ItemType.FightSanctuary) {
    return {
        itemType,
        x: 1,
        y: 1,
        size: 4,
        active: true,
    };
}
