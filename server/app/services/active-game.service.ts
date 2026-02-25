import { activeGame } from '@app/schemas/active-game';
import { game } from '@app/schemas/game';
import { IActiveGame } from '@common/activeGame';
import { CharacterFormData } from '@common/character';
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
        };
        return await activeGame.create(newActiveGame);
    }

    async addPlayerToActiveGame(activeGameId: string, characterForm: CharacterFormData): Promise<IActiveGame | null> {
        const activeGameToUpdate = await activeGame.findById(activeGameId);
        if (!activeGameToUpdate) {
            throw new Error('Active game not found');
        }
        const newPlayerCharacter = {
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
        return await activeGame.find().exec();
    }
}
