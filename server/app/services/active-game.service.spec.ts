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
            // Cas limite:
            // Une erreur devrait être levée si aucun game n'est trouvé avec l'ID fourni

            findGameByIdStub.resolves(null);

            try {
                await activeGameService.createActiveGame('nonExistentActiveGameId', {} as CharacterFormData);
                throw new Error('Expected method to reject.');
            } catch (err) {
                expect(err.message).to.equal('GAME_NOT_FOUND');
            }
        });

        it('should create a new active game successfully', async () => {
            // Cas nominal:
            // Un nouvel active game devrait être créé avec succès lorsque des données valides sont fournies

            findGameByIdStub.resolves(dummyGame);
            await activeGameService.createActiveGame('dummyGameId', dummyCharacterForm);

            expect(activeGameCreateStub.calledOnce).to.equal(true);
        });
    });

    describe('test adding players to an existing IActiveGame', () => {
        it('should throw if activeGame doesnt exists', async () => {
            // Cas limite:
            // Une erreur devrait être levée si aucun activeGame n'est trouvé avec l'ID fourni

            findActiveGameByIdStub.resolves(null);

            try {
                await activeGameService.addPlayerToActiveGame('nonExistentActiveGameId', {} as CharacterFormData);
                throw new Error('Expected method to reject.');
            } catch (err) {
                expect(err.message).to.equal('Active game not found');
            }
        });

        it('should not allow adding a player if the active game is already full', async () => {
            // Cas limite:
            // Une erreur devrait être levée si le nombre maximum de joueurs pour la partie active est déjà atteint

            const fullActiveGame = dummyActiveGame;
            fullActiveGame.maxPlayerCount = 4;
            fullActiveGame.players = [dummyPlayerCharacter, dummyPlayerCharacter, dummyPlayerCharacter, dummyPlayerCharacter]; // Simule une partie active déjà pleine

            findActiveGameByIdStub.resolves(fullActiveGame);

            try {
                await activeGameService.addPlayerToActiveGame('fullActiveGameId', dummyCharacterForm);
                throw new Error('Expected method to reject.');
            } catch (err) {
                expect(err.message).to.equal('Nombre maximum de joueurs atteint pour cette partie');
            }
        });

        it('should not allow adding a player with an avatar that is already taken in the active game', async () => {
            // Cas limite:
            // Une erreur devrait être levée si un joueur tente de rejoindre une partie active avec un avatar déjà utilisé par un autre joueur dans la même partie

            const collisionedAvatar = Avatar.Avatar1;

            const inGamePlayer = dummyPlayerCharacter;
            inGamePlayer.avatar = collisionedAvatar; // Simule un joueur dans la partie active qui utilise l'avatar Avatar1

            const activeGameWithAvatarConflict = dummyActiveGame;
            activeGameWithAvatarConflict.players = [inGamePlayer];

            findActiveGameByIdStub.resolves(activeGameWithAvatarConflict);

            const characterForm: CharacterFormData = {
                name: 'Player 2',
                avatar: collisionedAvatar, // Avatar déjà utilisé par Player 1
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
            // Cas limite:
            // Si un joueur tente de rejoindre une partie active avec un nom de personnage déjà utilisé par un autre
            //  joueur dans la même partie, le service devrait automatiquement ajouter un numéro à la fin du nom du nouveau joueur pour le différencier (ex: "PlayerName - 2")

            const collisionedName = 'Robert Bourassa';

            const inGamePlayer = dummyPlayerCharacter;
            inGamePlayer.name = collisionedName; // Simule un joueur dans la partie active qui utilise le nom Robert Bourassa

            const activeGameWithAvatarConflict = dummyActiveGame;
            activeGameWithAvatarConflict.players = [inGamePlayer];

            const saveStub = sinon.stub().resolves(activeGameWithAvatarConflict);
            findActiveGameByIdStub.resolves({ ...activeGameWithAvatarConflict, save: saveStub });

            const characterForm: CharacterFormData = {
                ...dummyCharacterForm,
                name: collisionedName, // Même nom de personnage que le joueur déjà dans la partie active
            };

            characterForm.avatar = Avatar.Avatar2; // Changement d'avatar pour éviter le conflit d'avatar
            let updatedGame = await activeGameService.addPlayerToActiveGame('activeGameWithAvatarConflictId', characterForm);
            expect(updatedGame.players[updatedGame.players.length - 1].name).to.equal('Robert Bourassa-2');

            characterForm.avatar = Avatar.Avatar3; // Changement d'avatar pour éviter le conflit d'avatar
            updatedGame = await activeGameService.addPlayerToActiveGame('activeGameWithAvatarConflictId', characterForm);
            expect(updatedGame.players[updatedGame.players.length - 1].name).to.equal('Robert Bourassa-3');

            // Cas limite: Si un joueur ajoute lui même un nom de personnage avec un -{numéro} à la fin
            // Comportement attendu: le système enlève le suffixe -{numéro} avant de processer le nom
            characterForm.avatar = Avatar.Avatar4; // Changement d'avatar pour éviter le conflit d'avatar
            characterForm.name = 'Robert Bourassa-2'; // Même nom que le joueur déjà dans la partie active, mais avec un -2 à la fin
            updatedGame = await activeGameService.addPlayerToActiveGame('activeGameWithAvatarConflictId', characterForm);
            expect(updatedGame.players[updatedGame.players.length - 1].name).to.equal('Robert Bourassa-4');
        });
    });

    it('should append the player to the database ', async () => {
        // Cas nominal

        const testName = 'TestPlayer';
        const avatar = Avatar.Avatar8;

        const saveStub = sinon.stub().resolves(dummyActiveGame);
        findActiveGameByIdStub.resolves({ ...dummyActiveGame, save: saveStub });

        const characterForm: CharacterFormData = {
            ...dummyCharacterForm,
            name: testName, // Même nom de personnage que le joueur déjà dans la partie active
            avatar, // Avatar pour le nouveau joueur
        };

        const updatedGame = await activeGameService.addPlayerToActiveGame('test', characterForm);
        const addedPlayer = updatedGame.players[updatedGame.players.length - 1];

        expect(addedPlayer.name).to.equal(testName);
        expect(addedPlayer.avatar).to.equal(avatar);
    });

    describe('test fetching an IActiveGame by ID', () => {
        it('should return the active game if it exists', async () => {
            // Cas nominal:
            // Le service devrait retourner la partie active correspondante à l'ID fourni si elle existe

            findActiveGameByIdStub.resolves(dummyActiveGame);

            const result = await activeGameService.getActiveGameById('dummyActiveGameId');

            expect(findActiveGameByIdStub.calledOnce).to.equal(true);
            expect(result).to.equal(dummyActiveGame);
        });
    });

    describe('test fetching joinable active games', () => {
        it('should return a list of joinable active games', async () => {
            // Cas nominal:
            // Le service devrait retourner une liste de parties actives joinables en faisant une query

            const findStub = sinon.stub(activeGameModel, 'find');

            await activeGameService.fetchJoinableActiveGames();

            expect(findStub.calledOnce).to.equal(true);
            expect(findStub.firstCall.args[0]).to.deep.equal({
                $expr: {
                    $lt: [{ $size: '$players' }, '$maxPlayerCount'],
                },
            });
        });
    });

    describe('test message management in the active game', () => {
        it('should add a message to the active game', async () => {
            // Cas nominal:
            // Le service devrait ajouter un message à la partie active correspondante à l\'ID fourni et retourner la partie active mise à jour

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
            // Cas limite:
            // L'id de ActiveGame passée à la fonction n'existe pas dans la base de données
            const getActiveGameByIdStub = sinon.stub(activeGameService, 'getActiveGameById');
            getActiveGameByIdStub.resolves(null);

            const result = await activeGameService.getMessagesFromGame('nonExistentId');
            expect(result).to.deep.equal([]);
        });

        it('should return the messages of the active game', async () => {
            // Cas nominal:
            // Le service devrait retourner la liste des messages de la partie active correspondante à l\'ID fourni

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
