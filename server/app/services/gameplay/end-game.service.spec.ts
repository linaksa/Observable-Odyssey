import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { EndGameService } from '@app/services/gameplay/end-game.service';
import { PositionValidatorService } from '@app/services/gameplay/position-validator.service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { expect } from 'chai';
import * as sinon from 'sinon';

describe('EndGameService', () => {
    let endGameService: EndGameService;
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
        saveActiveGameById: sinon.SinonStub;
    };
    let turnService: {
        endTurn: sinon.SinonStub;
    };
    let positionValidatorService: {
        resolveFlagDropPosition: sinon.SinonStub;
    };

    beforeEach(() => {
        activeGameService = {
            getActiveGameById: sinon.stub(),
            saveActiveGameById: sinon.stub().resolves(),
        };
        turnService = {
            endTurn: sinon.stub().resolves(),
        };
        positionValidatorService = {
            resolveFlagDropPosition: sinon.stub().returns({ x: 0, y: 0 }),
        };

        endGameService = new EndGameService(
            activeGameService as unknown as ActiveGameService,
            turnService as unknown as TurnService,
            positionValidatorService as unknown as PositionValidatorService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should mark the abandoning player as inactive in the active roster', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob', 'Carol'], 1);
        activeGameService.getActiveGameById.resolves(activeGame);

        await endGameService.handlePlayerAbandon('Bob', activeGame._id);

        expect(activeGame.players.map((player) => player.name)).to.deep.equal(['Alice', 'Bob', 'Carol']);
        expect(activeGame.players[1].hasAbandoned).to.equal(true);
        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
        expect(turnService.endTurn.calledOnceWithExactly(activeGame._id)).to.equal(true);
    });

    it('should stop after marking the last remaining opponent as abandoned', async () => {
        const activeGame = createActiveGame(['Alice', 'Bob'], 0);
        activeGameService.getActiveGameById.resolves(activeGame);

        await endGameService.handlePlayerAbandon('Bob', activeGame._id);

        expect(activeGame.players.map((player) => player.name)).to.deep.equal(['Alice', 'Bob']);
        expect(activeGame.players[1].hasAbandoned).to.equal(true);
        expect(turnService.endTurn.called).to.equal(false);
    });
});

function createActiveGame(playerNames: string[], currentPlayerIndex: number): IActiveGame {
    const players = playerNames.map((name) => createCharacter(name));

    return {
        _id: 'active-game-1',
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
        players,
        currentPlayerIndex,
        turnOrder: playerNames,
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Alice',
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
