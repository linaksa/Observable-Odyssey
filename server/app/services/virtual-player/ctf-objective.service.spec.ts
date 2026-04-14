import { AgressivePlayerService } from '@app/services/virtual-player/agressive-player.service';
import { CtfObjectiveService } from '@app/services/virtual-player/ctf-objective.service';
import { VirtualPlayerUtilitiesService } from '@app/services/virtual-player/virtual-player.utilities';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter, Team } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { ItemType } from '@common/items';
import { expect } from 'chai';
import * as sinon from 'sinon';

describe('CtfObjectiveService', () => {
    let ctfObjectiveService: CtfObjectiveService;
    let moveToPositionStub: sinon.SinonStub;
    let aggressivePlayStub: sinon.SinonStub;

    beforeEach(() => {
        moveToPositionStub = sinon.stub().resolves(true);
        aggressivePlayStub = sinon.stub().resolves();
        const virtualPlayerUtilities = {
            moveToPosition: moveToPositionStub,
        };
        const aggressivePlayerService = {
            play: aggressivePlayStub,
        };

        ctfObjectiveService = new CtfObjectiveService(
            virtualPlayerUtilities as unknown as VirtualPlayerUtilitiesService,
            aggressivePlayerService as unknown as AgressivePlayerService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should not handle non-CTF turns', async () => {
        const character = createCharacter('Bot');
        const game = createActiveGame(GameType.Classic);

        const handled = await ctfObjectiveService.handleTurnObjective(character, game);

        expect(handled).to.equal(false);
        expect(moveToPositionStub.called).to.equal(false);
    });

    it('should move the flag carrier toward their spawn tile', async () => {
        const character = createCharacter('Bot');
        const game = createActiveGame(GameType.Ctf);
        game.hasFlagId = 'Bot';

        const handled = await ctfObjectiveService.handleTurnObjective(character, game);

        expect(handled).to.equal(true);
        expect(moveToPositionStub.calledOnceWithExactly(character, game, character.startingPosition)).to.equal(true);
        expect(aggressivePlayStub.called).to.equal(false);
    });

    it('should start fighting when carrier cannot reach spawn', async () => {
        const carrier = createCharacter('Bot', Team.RED);
        const blocker = createCharacter('Enemy', Team.BLUE);
        blocker.currentPosition = { ...carrier.startingPosition };
        const game = createActiveGame(GameType.Ctf);
        game.players = [carrier, blocker];
        game.hasFlagId = 'Bot';
        moveToPositionStub.resolves(false);

        const handled = await ctfObjectiveService.handleTurnObjective(carrier, game);

        expect(handled).to.equal(true);
        expect(aggressivePlayStub.calledOnceWithExactly(carrier, game, blocker.name)).to.equal(true);
    });

    it('should move toward a free flag when no one carries it', async () => {
        const character = createCharacter('Bot');
        const game = createActiveGame(GameType.Ctf);
        game.hasFlagId = '';
        game.game.board.items = [{ itemType: ItemType.Flag, x: 2, y: 2, size: 1, isCarried: false }];

        const handled = await ctfObjectiveService.handleTurnObjective(character, game);

        expect(handled).to.equal(true);
        expect(moveToPositionStub.calledOnceWithExactly(character, game, { x: 2, y: 2 })).to.equal(true);
    });

    it('should continue toward spawn after picking the free flag with movement left', async () => {
        const character = createCharacter('Bot');
        character.movementLeft = 2;
        const game = createActiveGame(GameType.Ctf);
        game.hasFlagId = '';
        game.game.board.items = [{ itemType: ItemType.Flag, x: 2, y: 2, size: 1, isCarried: false }];

        moveToPositionStub.onFirstCall().callsFake(async () => {
            game.hasFlagId = character.name;
            character.movementLeft = 1;
            return true;
        });
        moveToPositionStub.onSecondCall().resolves(true);

        const handled = await ctfObjectiveService.handleTurnObjective(character, game);

        expect(handled).to.equal(true);
        expect(moveToPositionStub.firstCall.calledWithExactly(character, game, { x: 2, y: 2 })).to.equal(true);
        expect(moveToPositionStub.secondCall.calledWithExactly(character, game, character.startingPosition)).to.equal(true);
    });

    it('should not continue toward spawn after picking the free flag without movement left', async () => {
        const character = createCharacter('Bot');
        character.movementLeft = 1;
        const game = createActiveGame(GameType.Ctf);
        game.hasFlagId = '';
        game.game.board.items = [{ itemType: ItemType.Flag, x: 2, y: 2, size: 1, isCarried: false }];

        moveToPositionStub.callsFake(async () => {
            game.hasFlagId = character.name;
            character.movementLeft = 0;
            return true;
        });

        const handled = await ctfObjectiveService.handleTurnObjective(character, game);

        expect(handled).to.equal(true);
        expect(moveToPositionStub.calledOnceWithExactly(character, game, { x: 2, y: 2 })).to.equal(true);
    });

    it('should ignore the flag objective when another player carries it', async () => {
        const character = createCharacter('Bot');
        const game = createActiveGame(GameType.Ctf);
        game.hasFlagId = 'Enemy';
        game.game.board.items = [{ itemType: ItemType.Flag, x: 2, y: 2, size: 1, isCarried: true }];

        const handled = await ctfObjectiveService.handleTurnObjective(character, game);

        expect(handled).to.equal(false);
        expect(moveToPositionStub.called).to.equal(false);
    });
});

function createCharacter(name: string, team: Team = Team.RED): ICharacter {
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
        currentPosition: { x: 1, y: 1 },
        team,
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}

function createActiveGame(gameMode: GameType): IActiveGame {
    return {
        _id: 'game-1',
        game: {
            gameTitle: 'CTF',
            description: '',
            gameMode,
            dateCreated: new Date('2026-01-01T00:00:00.000Z'),
            lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
            visibility: Visibility.Hidden,
            board: {
                cells: [
                    [CellType.Empty, CellType.Empty, CellType.Empty],
                    [CellType.Empty, CellType.Empty, CellType.Empty],
                    [CellType.Empty, CellType.Empty, CellType.Empty],
                ],
                items: [],
            },
        },
        players: [],
        currentPlayerIndex: 0,
        turnOrder: [],
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
