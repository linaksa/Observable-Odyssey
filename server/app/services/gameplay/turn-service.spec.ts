import { ActiveGameService } from '@app/services/active-game/active-game.service';
import { SanctuaryService } from '@app/services/gameplay/sanctuary-service';
import { TurnService } from '@app/services/gameplay/turn-service';
import { SocketService } from '@app/services/realtime/socket.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { ItemType } from '@common/items';
import { Namespaces } from '@common/namespaces';
import { SANCTUARY_COOLDOWN_TURN_STEPS } from '@common/sanctuary';
import { SocketEvent } from '@common/socket-events';
import { expect } from 'chai';
import * as sinon from 'sinon';

const SANCTUARY_BUFFED_STAT = 5;

describe('TurnService', () => {
    let turnService: TurnService;
    let activeGameService: {
        getActiveGameById: sinon.SinonStub;
        saveActiveGameById: sinon.SinonStub;
    };
    let socketService: {
        getNamespace: sinon.SinonStub;
    };
    let namespaceSpy: {
        to: sinon.SinonStub;
    };
    let emitSpy: sinon.SinonStub;
    let sanctuaryService: SanctuaryService;

    beforeEach(() => {
        activeGameService = {
            getActiveGameById: sinon.stub(),
            saveActiveGameById: sinon.stub().resolves(),
        };
        emitSpy = sinon.stub();
        namespaceSpy = {
            to: sinon.stub().returns({
                emit: emitSpy,
            }),
        };
        socketService = {
            getNamespace: sinon.stub().returns(namespaceSpy),
        };
        sanctuaryService = new SanctuaryService(activeGameService as unknown as ActiveGameService);

        turnService = new TurnService(
            socketService as unknown as SocketService,
            activeGameService as unknown as ActiveGameService,
            sanctuaryService as unknown as SanctuaryService,
        );
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should reduce fight sanctuary duration when a player ends their turn', async () => {
        const activeGame = createActiveGame();
        activeGameService.getActiveGameById.resolves(activeGame);
        const onTurnEndedSpy = sinon.spy(sanctuaryService, 'onTurnEnded');
        const startTurnStub = sinon.stub(turnService, 'startTurn').resolves();

        await turnService.endTurn(activeGame._id);

        expect(onTurnEndedSpy.calledOnceWithExactly(activeGame, 'Alice')).to.equal(true);
        expect(activeGame.players[0].fightSanctuaryTurnsRemaining).to.equal(1);
        expect(activeGame.players[0].attackPoints).to.equal(SANCTUARY_BUFFED_STAT);
        expect(activeGame.players[0].defensePoints).to.equal(SANCTUARY_BUFFED_STAT);
        expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
        expect(socketService.getNamespace.calledOnceWithExactly(Namespaces.Game)).to.equal(true);
        expect(namespaceSpy.to.calledOnceWithExactly(activeGame._id)).to.equal(true);
        expect(emitSpy.calledOnceWithExactly(SocketEvent.PlayersUpdated, activeGame.players)).to.equal(true);
        expect(startTurnStub.calledOnceWithExactly(activeGame._id)).to.equal(true);
    });

    it('should advance sanctuary cooldowns when a turn starts', async () => {
        const activeGame = createActiveGame();
        activeGame.game.board.items = [
            {
                itemType: ItemType.LifeSanctuary,
                x: 0,
                y: 0,
                size: 4,
                active: false,
                inactiveTurnsRemaining: SANCTUARY_COOLDOWN_TURN_STEPS,
            },
        ];
        activeGameService.getActiveGameById.resolves(activeGame);
        const onTurnStartedSpy = sinon.spy(sanctuaryService, 'onTurnStarted');
        const clock = sinon.useFakeTimers();

        try {
            await turnService.startTurn(activeGame._id);

            expect(onTurnStartedSpy.calledOnceWithExactly(activeGame)).to.equal(true);
            expect(activeGame.turnIsInPreparation).to.equal(true);
            expect(activeGame.game.board.items[0].active).to.equal(false);
            expect(activeGame.game.board.items[0].inactiveTurnsRemaining).to.equal(SANCTUARY_COOLDOWN_TURN_STEPS - 1);
            expect(activeGameService.saveActiveGameById.calledOnceWithExactly(activeGame._id, activeGame)).to.equal(true);
            expect(socketService.getNamespace.calledOnceWithExactly(Namespaces.Game)).to.equal(true);
            expect(namespaceSpy.to.calledOnceWithExactly(activeGame._id)).to.equal(true);
            expect(emitSpy.calledOnceWithExactly(SocketEvent.TurnPreparing, { player: 'Alice' })).to.equal(true);
        } finally {
            clock.restore();
        }
    });
});

function createActiveGame(): IActiveGame {
    return {
        _id: 'active-game-1',
        game: {
            gameTitle: 'Turn game',
            description: '',
            gameMode: GameType.Classic,
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
        players: [
            {
                name: 'Alice',
                avatar: Avatar.Avatar1,
                initialHealth: 6,
                currentHealth: 6,
                attackBonusDiceType: DiceType.FourSided,
                defenseBonusDiceType: DiceType.SixSided,
                rapidityPoints: 4,
                attackPoints: 5,
                defensePoints: 5,
                actionsLeft: 1,
                movementLeft: 4,
                victories: 0,
                hasAbandoned: false,
                positionDepart: { x: 0, y: 0 },
                positionGrille: { x: 0, y: 0 },
                fightSanctuaryUsed: true,
                fightSanctuaryTurnsRemaining: 2,
                fightSanctuaryBonus: 1,
            },
            {
                name: 'Bob',
                avatar: Avatar.Avatar2,
                initialHealth: 6,
                currentHealth: 6,
                attackBonusDiceType: DiceType.FourSided,
                defenseBonusDiceType: DiceType.SixSided,
                rapidityPoints: 4,
                attackPoints: 4,
                defensePoints: 4,
                actionsLeft: 1,
                movementLeft: 4,
                victories: 0,
                hasAbandoned: false,
                positionDepart: { x: 1, y: 0 },
                positionGrille: { x: 1, y: 0 },
            },
        ],
        currentPlayerIndex: 0,
        turnOrder: ['Alice', 'Bob'],
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Organizer',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        turnStartTimeStamp: 0,
        currentAttack: null,
        hasFlagId: '',
    };
}
