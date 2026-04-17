/**
 * Testing strategy — VirtualPlayerSanctuaryService fallback behavior
 *
 * Approach:
 * - Stub reachability, movement, sanctuary interaction, socket, and log dependencies.
 * - Drive tryFallbackObjective() through health, sanctuary type, and action/movement scenarios.
 * - Verify selected sanctuary coordinates, interaction dispatch, and log callback forwarding.
 *
 * Edge cases covered:
 * - No reachable adjacent tile or failed move returns false.
 * - Zero actions left returns true without triggering sanctuary interaction.
 * - Undefined fight-sanctuary flags still allow fallback when the cooldown is clear.
 * - Fight sanctuary targets are ignored once the bonus was already consumed.
 * - Fight sanctuary cooldown turns also block fallback targeting.
 */
import { MovementService } from '@app/services/gameplay/movement-service';
import { GameplayActionService } from '@app/services/realtime/gameplay-action.service';
import { GameplayLogService } from '@app/services/realtime/gameplay-log.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { VirtualPlayerSanctuaryService } from '@app/services/virtual-player/virtual-player-sanctuary.service';
import { VirtualPlayerUtilitiesService } from '@app/services/virtual-player/virtual-player.utilities';
import { IActiveGame } from '@common/active-game';
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
    };
    let gameplayLogService: { emitGameLogToRoom: sinon.SinonStub };
    let socketService: { getNamespace: sinon.SinonStub };
    let service: VirtualPlayerSanctuaryService;

    beforeEach(() => {
        movementService = { getReachablePositions: sinon.stub().resolves([{ x: 0, y: 0 }]) };
        virtualPlayerUtilities = { moveToPosition: sinon.stub().resolves(true) };
        gameplayActionService = {
            handleSanctuaryInteraction: sinon.stub().resolves(),
        };
        gameplayLogService = { emitGameLogToRoom: sinon.stub() };
        socketService = { getNamespace: sinon.stub().returns({ to: sinon.stub().returns({ emit: sinon.stub() }) }) };

        service = new VirtualPlayerSanctuaryService(
            movementService as unknown as MovementService,
            virtualPlayerUtilities as unknown as VirtualPlayerUtilitiesService,
            gameplayActionService as unknown as GameplayActionService,
            gameplayLogService as unknown as GameplayLogService,
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

    it('should consider half health as low health and prioritize life sanctuary', async () => {
        const character = createCharacter('Bot');
        // Edge threshold: exactly half health should still prioritize life sanctuaries.
        character.currentHealth = 3;

        const game = createGame([createSanctuary(ItemType.LifeSanctuary), createSanctuary(ItemType.FightSanctuary)]);
        movementService.getReachablePositions.resolves([{ x: 0, y: 1 }]);

        const handled = await service.tryFallbackObjective(character, game);

        expect(handled).to.equal(true);
        expect(gameplayActionService.handleSanctuaryInteraction.calledOnce).to.equal(true);
        const interactionData = gameplayActionService.handleSanctuaryInteraction.firstCall.args[0];
        expect(interactionData.position).to.deep.equal({ x: 1, y: 1 });
    });

    it('should keep sanctuary coordinates unchanged when interacting', async () => {
        const character = createCharacter('Bot');
        character.currentHealth = 2;

        const game = createGame([createSanctuary(ItemType.LifeSanctuary, 1, 0)]);
        movementService.getReachablePositions.resolves([{ x: 2, y: 1 }]);

        const handled = await service.tryFallbackObjective(character, game);

        expect(handled).to.equal(true);
        expect(gameplayActionService.handleSanctuaryInteraction.calledOnce).to.equal(true);
        const interactionData = gameplayActionService.handleSanctuaryInteraction.firstCall.args[0];
        expect(interactionData.position).to.deep.equal({ x: 1, y: 0 });
    });

    it('returns false when no active sanctuary target is reachable', async () => {
        const character = createCharacter('Bot');
        const game = createGame([createSanctuary(ItemType.LifeSanctuary)]);
        movementService.getReachablePositions.resolves([]);

        const handled = await service.tryFallbackObjective(character, game);

        expect(handled).to.equal(false);
        expect(gameplayActionService.handleSanctuaryInteraction.called).to.equal(false);
    });

    it('returns false when move to sanctuary target fails', async () => {
        const character = createCharacter('Bot');
        character.currentHealth = 2;
        const game = createGame([createSanctuary(ItemType.LifeSanctuary)]);
        movementService.getReachablePositions.resolves([{ x: 0, y: 1 }]);
        virtualPlayerUtilities.moveToPosition.resolves(false);

        const handled = await service.tryFallbackObjective(character, game);

        expect(handled).to.equal(false);
    });

    it('returns true without interaction when no actions are left', async () => {
        const character = createCharacter('Bot');
        character.actionsLeft = 0;
        character.currentHealth = 2;
        const game = createGame([createSanctuary(ItemType.LifeSanctuary)]);
        movementService.getReachablePositions.resolves([{ x: 0, y: 1 }]);

        const handled = await service.tryFallbackObjective(character, game);

        expect(handled).to.equal(true);
        expect(gameplayActionService.handleSanctuaryInteraction.called).to.equal(false);
    });

    it('ignores fight sanctuaries when fight sanctuary was already used', async () => {
        const character = createCharacter('Bot');
        character.currentHealth = 5;
        character.fightSanctuaryUsed = true;
        const game = createGame([createSanctuary(ItemType.FightSanctuary)]);
        movementService.getReachablePositions.resolves([{ x: 0, y: 1 }]);

        const handled = await service.tryFallbackObjective(character, game);

        expect(handled).to.equal(false);
    });

    // Edge case: an ongoing fight sanctuary cooldown should block fight sanctuary fallback too.
    it('ignores fight sanctuaries when cooldown turns remain', async () => {
        const character = createCharacter('Bot');
        character.currentHealth = 5;
        character.fightSanctuaryTurnsRemaining = 2;
        const game = createGame([createSanctuary(ItemType.FightSanctuary)]);
        movementService.getReachablePositions.resolves([{ x: 0, y: 1 }]);

        const handled = await service.tryFallbackObjective(character, game);

        expect(handled).to.equal(false);
    });

    it('should fallback to fight sanctuary when fight flags are undefined — Edge case', async () => {
        const character = createCharacter('Bot');
        character.currentHealth = 5;
        delete character.fightSanctuaryUsed;
        delete character.fightSanctuaryTurnsRemaining;

        const game = createGame([createSanctuary(ItemType.FightSanctuary)]);
        movementService.getReachablePositions.resolves([{ x: 0, y: 1 }]);

        const handled = await service.tryFallbackObjective(character, game);

        expect(handled).to.equal(true);
        expect(gameplayActionService.handleSanctuaryInteraction.calledOnce).to.equal(true);
    });

    it('does not move when already adjacent to sanctuary target', async () => {
        const character = createCharacter('Bot');
        character.currentPosition = { x: 0, y: 1 };
        character.currentHealth = 2;
        const game = createGame([createSanctuary(ItemType.LifeSanctuary)]);
        movementService.getReachablePositions.resolves([{ x: 0, y: 1 }]);

        await service.tryFallbackObjective(character, game);

        expect(virtualPlayerUtilities.moveToPosition.called).to.equal(false);
    });

    it('forwards sanctuary interaction log callback to gameplay log service', async () => {
        const character = createCharacter('Bot');
        character.currentHealth = 2;
        const game = createGame([createSanctuary(ItemType.LifeSanctuary)]);
        movementService.getReachablePositions.resolves([{ x: 0, y: 1 }]);
        gameplayActionService.handleSanctuaryInteraction.callsFake(async (_data, _socket, _namespace, emitGameLog) => {
            emitGameLog('game-1', 'sanctuary-log');
        });

        await service.tryFallbackObjective(character, game);

        expect(gameplayLogService.emitGameLogToRoom.calledOnceWithExactly('game-1', 'sanctuary-log')).to.equal(true);
    });

    it('skips sanctuaries with no reachable adjacent tile and keeps scanning targets', async () => {
        const character = createCharacter('Bot');
        character.currentHealth = 2;
        const game = createGame([createSanctuary(ItemType.LifeSanctuary, 1, 1), createSanctuary(ItemType.LifeSanctuary, 2, 2)]);
        movementService.getReachablePositions.resolves([
            { x: 1, y: 2 },
            { x: 0, y: 0 },
        ]);

        const handled = await service.tryFallbackObjective(character, game);

        expect(handled).to.equal(true);
        const interactionData = gameplayActionService.handleSanctuaryInteraction.firstCall.args[0];
        expect(interactionData.position).to.deep.equal({ x: 2, y: 2 });
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

function createSanctuary(itemType: ItemType.LifeSanctuary | ItemType.FightSanctuary, x: number = 1, y: number = 1) {
    return {
        itemType,
        x,
        y,
        size: 4,
        active: true,
    };
}
