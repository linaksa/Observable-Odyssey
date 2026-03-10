import { activeGame } from '@app/schemas/active-game';
import { game } from '@app/schemas/game';
import { IActiveGame } from '@common/activeGame';
import { BOARD_SIZE_TO_PLAYER_COUNT } from '@common/board';
import { CharacterFormData, ICharacter } from '@common/character';
import { IMessage, INewMessage } from '@common/message';
import { Service } from 'typedi';

@Service()
export class ActiveGameService {
    async createActiveGame(gameId: string, characterForm: CharacterFormData): Promise<IActiveGame> {
        const gameChosen = await game.findById(gameId);
        if (!gameChosen) {
            throw new Error('Game introuvable');
        }
        const playerCharacter = {
            name: characterForm.name,
            avatar: characterForm.avatar,
            initialHealth: characterForm.initialHealth,
            currentHealth: characterForm.initialHealth,
            attackBonusDiceType: characterForm.attackBonusDiceType,
            defenseBonusDiceType: characterForm.defenseBonusDiceType,
            rapidityPoints: characterForm.rapidityPoints,
            attackPoints: characterForm.attackPoints,
            defensePoints: characterForm.defensePoints,
            actionsLeft: 1, // à revoir
            movementLeft: characterForm.rapidityPoints, // à revoir
            //positionGrille: { x: 0, y: 0 }, // à revoir
            //spawnPoint: { x: 0, y: 0 }, // à revoir
            //victories: 0,
            x: 0, // TO BE REMOVED
            y: 0, // TO BE REMOVED
            wonCombatCount: 0,
            hasAbandoned: false,
        };
        const exampleItem = {
            x: 1,
            y: 1,
            size: 3,
            itemType: 'lifeSanctuary',
            active: true,
            isCarried: false,
        };

        const newActiveGame = {
            game: gameChosen,
            players: [playerCharacter],
            itemsState: [exampleItem],
            currentPlayerIndex: 0,
            messages: [] as IMessage[],
            isDebugMode: false,
            organizerName: characterForm.name,
            maxPlayerCount: BOARD_SIZE_TO_PLAYER_COUNT[gameChosen.board.cells.length],
        };
        return await activeGame.create(newActiveGame);
    }

    async addPlayerToActiveGame(activeGameId: string, characterForm: CharacterFormData): Promise<IActiveGame | null> {
        const activeGameToUpdate = await activeGame.findById(activeGameId);
        if (!activeGameToUpdate) {
            throw new Error('Active game not found');
        }

        const maxPlayers = activeGameToUpdate.maxPlayerCount;
        if (activeGameToUpdate.players.length >= maxPlayers) {
            throw new Error('Nombre maximum de joueurs atteint pour cette partie');
        }

        const newPlayerAvatar = characterForm.avatar;
        if (activeGameToUpdate.players.some(player => player.avatar === newPlayerAvatar)) {
            throw new Error('Avatar déjà utilisé par un autre joueur dans cette partie');
        }

        const uniquePlayerName = this.generateUniquePlayerName(characterForm.name, activeGameToUpdate.players);

        const newPlayerCharacter = {
            name: uniquePlayerName,
            avatar: characterForm.avatar,
            initialHealth: characterForm.initialHealth,
            currentHealth: characterForm.initialHealth,
            attackBonusDiceType: characterForm.attackBonusDiceType,
            defenseBonusDiceType: characterForm.defenseBonusDiceType,
            rapidityPoints: characterForm.rapidityPoints,
            attackPoints: characterForm.attackPoints,
            defensePoints: characterForm.defensePoints,
            actionsLeft: 1, // à revoir
            movementLeft: characterForm.rapidityPoints, // à revoir
            //positionGrille: { x: 0, y: 0 }, // à revoir
            //spawnPoint: { x: 0, y: 0 }, // à revoir
            //victories: 0,
            x: 0, // TO BE REMOVED
            y: 0, // TO BE REMOVED
            wonCombatCount: 0,
            hasAbandoned: false,
        };
        activeGameToUpdate.players.push(newPlayerCharacter);
        return await activeGameToUpdate.save();
    }
    async getActiveGameById(activeGameId: string): Promise<IActiveGame> {
        return await activeGame.findById(activeGameId).exec();
    }

    async getAllActiveGames(): Promise<IActiveGame[]> {
        return await activeGame.find().exec();
    }

    async addMessageToGame(newMessage: INewMessage): Promise<IActiveGame | null> {
        const message: IMessage = {
            postedAt: new Date(),
            content: newMessage.content,
            author: newMessage.author,
        };
        return await activeGame.findOneAndUpdate({ _id: newMessage.roomId }, { $push: { messages: message } }, { new: true }).exec();
    }

    async getMessagesFromGame(id: string): Promise<IMessage[]> {
        const gameMessages = await activeGame.findOne({ _id: id }).select('messages');
        if (!gameMessages) return [];
        return gameMessages.messages;
    }
    async fetchJoinableActiveGames(): Promise<IActiveGame[]> {
        return await activeGame.find({
            $expr: {
                $lt: [{ $size: '$players' }, '$maxPlayerCount'],
            },
        }).exec();
    }

    private generateUniquePlayerName(newPlayerName: string, existingPlayers: ICharacter[]): string {
        // remove any existing -{number} suffix from malicious players
        newPlayerName = newPlayerName.trim().replace(/-\d+$/, '');

        const regex = /^(.*)-(\d+)$/; // match "PlayerName - 1234" et capture "PlayerName" et "1234"
        let uniquePlayerIdToAppend = 1;

        existingPlayers.forEach(player => {
            let name = player.name;
            let uniqueAddedId = null;

            const match = name.match(regex);
            if (match) {
                name = match[1].trim();
                uniqueAddedId = parseInt(match[2], 10);
            }

            if (name === newPlayerName) {
                uniquePlayerIdToAppend = Math.max(uniquePlayerIdToAppend, (uniqueAddedId || 0)) + 1;
            }
        });

        if (uniquePlayerIdToAppend > 1) {
            return `${newPlayerName}-${uniquePlayerIdToAppend}`;
        }
        return newPlayerName;
    }
}
