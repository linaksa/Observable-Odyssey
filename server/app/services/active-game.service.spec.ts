import { activeGame } from '@app/schemas/active-game';
import { IActiveGame } from '@common/activeGame';
import { CharacterFormData, ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { ActiveGameService } from './active-game.service';

describe('ActiveGameService', () => {
    let activeGameService: ActiveGameService;

    //let activeGameCreateStub: sinon.SinonStub;
    let findByIdStub: sinon.SinonStub;
    //let findByIdAndUpdateStub: sinon.SinonStub;
    //let findByIdAndDeleteStub: sinon.SinonStub;
    //let findStub: sinon.SinonStub;

    const dummyActiveGame: IActiveGame = {
        _id: 'dummyActiveGameId',
        game: {
            _id: 'dummyGameId',
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
        } as IGame,
        players: [],
        itemsState: [],
        currentPlayerIndex: 0,
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
        x: 0,
        y: 0,
        wonCombatCount: 0,
        hasAbandoned: false,
    };

    beforeEach(async () => {
        activeGameService = new ActiveGameService();

        //activeGameCreateStub = sinon.stub(activeGame, 'create');
        findByIdStub = sinon.stub(activeGame, 'findById');
        // findByIdAndUpdateStub = sinon.stub(activeGame, 'findByIdAndUpdate');
        // findByIdAndDeleteStub = sinon.stub(activeGame, 'findByIdAndDelete');
        // findStub = sinon.stub(activeGame, 'find');
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('should throw if activeGame doesnt exists', () => {
        it('should throw if activeGame doesnt exists', async () => {
            // Cas limite:
            // Une erreur devrait être levée si aucun activeGame n'est trouvé avec l'ID fourni

            findByIdStub.resolves(null);

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

            findByIdStub.resolves(fullActiveGame);

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

            findByIdStub.resolves(activeGameWithAvatarConflict);

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
            findByIdStub.resolves({ ...activeGameWithAvatarConflict, save: saveStub });

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
});
