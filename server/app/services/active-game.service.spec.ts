import { activeGameModel } from '@app/schemas/active-game';
import { game } from '@app/schemas/game';
import { IActiveGame } from '@common/activeGame';
import { CharacterFormData, ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { INewMessage } from '@common/message';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { ActiveGameService } from './active-game.service';

describe('ActiveGameService', () => {
    let activeGameService: ActiveGameService;

    let activeGameCreateStub: sinon.SinonStub;
    let findActiveGameByIdStub: sinon.SinonStub;
    let findGameByIdStub: sinon.SinonStub;
    let findOneAndUpdateStub: sinon.SinonStub;

    const dummyGame: IGame = {
        gameTitle: 'Dummy Game',
        description: 'A dummy game for testing',
        gameMode: GameType.Classic,
        lastModifiedDate: new Date(),
        dateCreated: new Date(),
        visibility: Visibility.Viewable,
        preview: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
        board: {
            cells: [],
            items: [],
        },
    };

    const dummyActiveGame: IActiveGame = {
        _id: 'dummyActiveGameId',
        game: dummyGame,
        players: [],
        itemsState: [],
        currentPlayerIndex: 0,
        turnOrder: [],
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Dummy Organizer',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
    };

    const dummyCharacterForm: CharacterFormData = {
        name: 'Dummy Character',
        avatar: Avatar.Avatar1,
        initialHealth: 100,
        attackBonusDiceType: DiceType.SixSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints: 3,
        attackPoints: 2,
        defensePoints: 2,
    };

    const dummyPlayerCharacter: ICharacter = {
        name: dummyCharacterForm.name,
        avatar: Avatar.Avatar3,
        initialHealth: dummyCharacterForm.initialHealth,
        currentHealth: dummyCharacterForm.initialHealth,
        attackBonusDiceType: dummyCharacterForm.attackBonusDiceType,
        defenseBonusDiceType: dummyCharacterForm.defenseBonusDiceType,
        rapidityPoints: dummyCharacterForm.rapidityPoints,
        attackPoints: dummyCharacterForm.attackPoints,
        defensePoints: dummyCharacterForm.defensePoints,
        actionsLeft: 1,
        movementLeft: dummyCharacterForm.rapidityPoints,
        hasAbandoned: false,
        victories: 0,
        positionDepart: {
            x: 1,
            y: 1,
        },
        positionGrille: {
            x: 1,
            y: 1,
        },
    };

    beforeEach(async () => {
        activeGameService = new ActiveGameService();

        activeGameCreateStub = sinon.stub(activeGameModel, 'create');
        findGameByIdStub = sinon.stub(game, 'findById');
        findActiveGameByIdStub = sinon.stub(activeGameModel, 'findById');
        findOneAndUpdateStub = sinon.stub(activeGameModel, 'findOneAndUpdate');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('test creation of a new IActiveGame', () => {
        it('should throw if game does not exist, async ()', async () => {
            // Edge case:
            // An error should be thrown if no game is found with the provided ID

            findGameByIdStub.resolves(null);

            try {
                await activeGameService.createActiveGame('nonExistentActiveGameId', {} as CharacterFormData);
                throw new Error('Expected method to reject.');
            } catch (err) {
                expect(err.message).to.equal('GAME_NOT_FOUND');
            }
        });

        it('should create a new active game successfully', async () => {
            // Nominal case:
            // A new active game should be created successfully when valid data is provided

            findGameByIdStub.resolves(dummyGame);
            await activeGameService.createActiveGame('dummyGameId', dummyCharacterForm);

            expect(activeGameCreateStub.calledOnce).to.equal(true);
        });
    });

    describe('test adding players to an existing IActiveGame', () => {
        it('should throw if activeGame doesnt exists', async () => {
            // Edge case:
            // An error should be thrown if no activeGame is found with the provided ID

            findActiveGameByIdStub.resolves(null);

            try {
                await activeGameService.addPlayerToActiveGame('nonExistentActiveGameId', {} as CharacterFormData);
                throw new Error('Expected method to reject.');
            } catch (err) {
                expect(err.message).to.equal('ACTIVE_GAME_NOT_FOUND');
            }
        });

        it('should not allow adding a player if the active game is already full', async () => {
            // Edge case:
            // An error should be thrown if the active game's maximum player count has already been reached

            const fullActiveGame = dummyActiveGame;
            fullActiveGame.maxPlayerCount = 4;
            fullActiveGame.players = [dummyPlayerCharacter, dummyPlayerCharacter, dummyPlayerCharacter, dummyPlayerCharacter]; // Simulates an active game that is already full

            findActiveGameByIdStub.resolves(fullActiveGame);

            try {
                await activeGameService.addPlayerToActiveGame('fullActiveGameId', dummyCharacterForm);
                throw new Error('Expected method to reject.');
            } catch (err) {
                expect(err.message).to.equal('Nombre maximum de joueurs atteint pour cette partie');
            }
        });

        it('should not allow adding a player with an avatar that is already taken in the active game', async () => {
            // Edge case:
            // An error should be thrown if a player tries to join an active game with an avatar that is already used by another player in the same game

            const collisionedAvatar = Avatar.Avatar1;

            const inGamePlayer = dummyPlayerCharacter;
            inGamePlayer.avatar = collisionedAvatar; // Simulates a player in the active game who uses the Avatar1 avatar

            const activeGameWithAvatarConflict = dummyActiveGame;
            activeGameWithAvatarConflict.players = [inGamePlayer];

            findActiveGameByIdStub.resolves(activeGameWithAvatarConflict);

            const characterForm: CharacterFormData = {
                name: 'Player 2',
                avatar: collisionedAvatar, // Avatar already used by Player 1
                initialHealth: 100,
                attackBonusDiceType: DiceType.SixSided,
                defenseBonusDiceType: DiceType.SixSided,
                rapidityPoints: 3,
                attackPoints: 2,
                defensePoints: 2,
            };

            try {
                await activeGameService.addPlayerToActiveGame('activeGameWithAvatarConflictId', characterForm);
                throw new Error('Expected method to reject.');
            } catch (err) {
                expect(err.message).to.equal('Avatar déjà utilisé par un autre joueur dans cette partie');
            }
        });

        it("should append a number to the player's name if another player in the active game has the same base name", async () => {
            // Edge case:
            // If a player tries to join an active game with a character name already used by another
            //  player in the same game, the service should automatically append a number to the new player's name to differentiate it (e.g., "PlayerName - 2")

            const collisionedName = 'Robert Bourassa';

            const inGamePlayer = dummyPlayerCharacter;
            inGamePlayer.name = collisionedName; // Simulates a player in the active game who uses the name Robert Bourassa

            const activeGameWithAvatarConflict = dummyActiveGame;
            activeGameWithAvatarConflict.players = [inGamePlayer];

            const saveStub = sinon.stub().resolves(activeGameWithAvatarConflict);
            findActiveGameByIdStub.resolves({ ...activeGameWithAvatarConflict, save: saveStub });

            const characterForm: CharacterFormData = {
                ...dummyCharacterForm,
                name: collisionedName, // Same character name as a player already in the active game
            };

            characterForm.avatar = Avatar.Avatar2; // Change avatar to avoid avatar conflict
            let updatedGame = await activeGameService.addPlayerToActiveGame('activeGameWithAvatarConflictId', characterForm);
            expect(updatedGame.players[updatedGame.players.length - 1].name).to.equal('Robert Bourassa-2');

            characterForm.avatar = Avatar.Avatar3; // Change avatar to avoid avatar conflict
            updatedGame = await activeGameService.addPlayerToActiveGame('activeGameWithAvatarConflictId', characterForm);
            expect(updatedGame.players[updatedGame.players.length - 1].name).to.equal('Robert Bourassa-3');

            // Edge case: If a player adds a character name that already ends with a -{number}
            // Expected behavior: the system should remove the -{number} suffix before processing the name
            characterForm.avatar = Avatar.Avatar4; // Change avatar to avoid avatar conflict
            characterForm.name = 'Robert Bourassa-2'; // Same name as a player already in the active game, but with a -2 suffix
            updatedGame = await activeGameService.addPlayerToActiveGame('activeGameWithAvatarConflictId', characterForm);
            expect(updatedGame.players[updatedGame.players.length - 1].name).to.equal('Robert Bourassa-4');
        });
    });

    it('should append the player to the database ', async () => {
        // Nominal case

        const testName = 'TestPlayer';
        const avatar = Avatar.Avatar8;

        const saveStub = sinon.stub().resolves(dummyActiveGame);
        findActiveGameByIdStub.resolves({ ...dummyActiveGame, save: saveStub });

        const characterForm: CharacterFormData = {
            ...dummyCharacterForm,
            name: testName, // Same character name as a player already in the active game
            avatar, // Avatar for the new player
        };

        const updatedGame = await activeGameService.addPlayerToActiveGame('test', characterForm);
        const addedPlayer = updatedGame.players[updatedGame.players.length - 1];

        expect(addedPlayer.name).to.equal(testName);
        expect(addedPlayer.avatar).to.equal(avatar);
    });

    describe('test fetching an IActiveGame by ID', () => {
        it('should return the active game if it exists', async () => {
            // Nominal case:
            // The service should return the active game corresponding to the provided ID if it exists

            findActiveGameByIdStub.resolves(dummyActiveGame);

            const result = await activeGameService.getActiveGameById('dummyActiveGameId');

            expect(findActiveGameByIdStub.calledOnce).to.equal(true);
            expect(result).to.equal(dummyActiveGame);
        });
    });

    describe('test fetching joinable active games', () => {
        it('should return a list of joinable active games', async () => {
            // Nominal case:
            // The service should return a list of joinable active games by querying the database

            const findStub = sinon.stub(activeGameModel, 'find');

            await activeGameService.fetchJoinableActiveGames();

            expect(findStub.calledOnce).to.equal(true);
            expect(findStub.firstCall.args[0]).to.deep.equal({
                isFinished: false,
                turnOrder: { $size: 0 },
                $expr: {
                    $lt: [{ $size: '$players' }, '$maxPlayerCount'],
                },
            });
        });
    });

    describe('test message management in the active game', () => {
        it('should add a message to the active game', async () => {
            // Nominal case:
            // The service should add a message to the active game matching the provided ID and return the updated active game

            const newMessage: INewMessage = {
                roomId: 'dummyActiveGameId',
                content: 'Hello, world!',
                author: 'TestUser',
            };

            findOneAndUpdateStub.resolves(dummyActiveGame);
            await activeGameService.addMessageToGame(newMessage);

            expect(findOneAndUpdateStub.calledOnce).to.equal(true);
            expect(findOneAndUpdateStub.firstCall.args[1].$push.messages).to.deep.include({
                content: newMessage.content,
                author: newMessage.author,
            });
        });

        it('should return an empty array if the active game is not found', async () => {
            // Edge case:
            // The ActiveGame id passed to the function does not exist in the database
            const getActiveGameByIdStub = sinon.stub(activeGameService, 'getActiveGameById');
            getActiveGameByIdStub.resolves(null);

            const result = await activeGameService.getMessagesFromGame('nonExistentId');
            expect(result).to.deep.equal([]);
        });

        it('should return the messages of the active game', async () => {
            // Nominal case:
            // The service should return the list of messages for the active game corresponding to the provided ID

            const messages = [
                {
                    content: 'Hello, world!',
                    author: 'TestUser',
                },
            ];

            const getActiveGameByIdStub = sinon.stub(activeGameService, 'getActiveGameById');
            getActiveGameByIdStub.resolves({ ...dummyActiveGame, messages } as IActiveGame);

            const result = await activeGameService.getMessagesFromGame('dummyActiveGameId');
            expect(result).to.equal(messages);
        });
    });
});
