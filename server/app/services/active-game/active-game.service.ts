import { activeGameModel } from '@app/schemas/active-game';
import { game } from '@app/schemas/game';
import { IActiveGame, ICurrentAttack } from '@common/activeGame';
import { AttackPosture } from '@common/attackResult';
import { BOARD_SIZE_TO_PLAYER_COUNT } from '@common/board';
import { CharacterFormData, ICharacter } from '@common/character';
import { IMessage, INewMessage } from '@common/message';
import { Service } from 'typedi';

@Service()
export class ActiveGameService {
    async createActiveGame(gameId: string, characterForm: CharacterFormData): Promise<IActiveGame> {
        const gameChosen = await game.findById(gameId);
        if (!gameChosen) {
            throw new Error('GAME_NOT_FOUND');
        }

        const sanctuaryState = this.createDefaultSanctuaryState();
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
            actionsLeft: 1,
            movementLeft: characterForm.rapidityPoints,
            victories: 0,
            positionGrille: { x: 0, y: 0 },
            positionDepart: { x: 0, y: 0 },
            hasAbandoned: false,

            nCombats: 0,
            nVictories: 0,
            nDefeats: 0,
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            visitedCells: [] as string[],
            ...sanctuaryState,
        };

        const newActiveGame = {
            game: gameChosen,
            players: [playerCharacter],
            turnOrder: [] as string[],
            currentPlayerIndex: 0,
            isFinished: false,
            winner: '',
            messages: [] as IMessage[],
            isDebugMode: false,
            organizerName: characterForm.name,
            maxPlayerCount: BOARD_SIZE_TO_PLAYER_COUNT[gameChosen.board.cells.length],
            turnIsInPreparation: false,
            hasFlagId: '',
        };

        return await activeGameModel.create(newActiveGame);
    }

    async addPlayerToActiveGame(activeGameId: string, characterForm: CharacterFormData): Promise<IActiveGame | null> {
        const activeGameToUpdate = await activeGameModel.findById(activeGameId);
        if (!activeGameToUpdate) {
            throw new Error('ACTIVE_GAME_NOT_FOUND');
        }

        const maxPlayers = activeGameToUpdate.maxPlayerCount;
        if (activeGameToUpdate.players.length >= maxPlayers) {
            throw new Error('Nombre maximum de joueurs atteint pour cette partie');
        }

        const newPlayerAvatar = characterForm.avatar;
        if (activeGameToUpdate.players.some((player) => player.avatar === newPlayerAvatar)) {
            throw new Error('Avatar déjà utilisé par un autre joueur dans cette partie');
        }

        const uniquePlayerName = this.generateUniquePlayerName(characterForm.name, activeGameToUpdate.players);
        const sanctuaryState = this.createDefaultSanctuaryState();

        const newPlayerCharacter: ICharacter = {
            name: uniquePlayerName,
            avatar: characterForm.avatar,
            initialHealth: characterForm.initialHealth,
            currentHealth: characterForm.initialHealth,
            attackBonusDiceType: characterForm.attackBonusDiceType,
            defenseBonusDiceType: characterForm.defenseBonusDiceType,
            rapidityPoints: characterForm.rapidityPoints,
            attackPoints: characterForm.attackPoints,
            defensePoints: characterForm.defensePoints,
            actionsLeft: 1,
            movementLeft: characterForm.rapidityPoints,
            victories: 0,
            hasAbandoned: false,
            positionDepart: { x: 0, y: 0 },
            positionGrille: { x: 0, y: 0 },
            virtualPlayerProfile: characterForm.virtualPlayerProfile ?? undefined,

            nCombats: 0,
            nVictories: 0,
            nDefeats: 0,
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            visitedCells: [],

            ...sanctuaryState,
        };
        activeGameToUpdate.players.push(newPlayerCharacter);

        return await activeGameToUpdate.save();
    }
    async getActiveGameById(activeGameId: string): Promise<IActiveGame> {
        return await activeGameModel.findById(activeGameId);
    }

    async saveActiveGameById(activeGameId: string, update: Partial<IActiveGame>): Promise<IActiveGame | null> {
        return await activeGameModel.findByIdAndUpdate(activeGameId, update, { returnDocument: 'after' });
    }
    async deleteGameById(activeGameId: string): Promise<void> {
        return await activeGameModel.findByIdAndDelete(activeGameId);
    }

    async addMessageToGame(newMessage: INewMessage): Promise<IActiveGame | null> {
        const message: IMessage = {
            postedAt: new Date(),
            content: newMessage.content,
            author: newMessage.author,
        };
        return await activeGameModel.findOneAndUpdate({ _id: newMessage.roomId }, { $push: { messages: message } }, { returnDocument: 'after' });
    }
    async removePlayer(gameId: string, playerName: string): Promise<void> {
        const activeGame = await this.getActiveGameById(gameId);
        if (!activeGame) return;
        activeGame.players = activeGame.players.filter((player) => player.name !== playerName);
        await this.saveActiveGameById(gameId, activeGame);
    }

    async getMessagesFromGame(id: string): Promise<IMessage[]> {
        const currentActiveGame = await this.getActiveGameById(id);
        if (!currentActiveGame) return [];
        return currentActiveGame.messages;
    }

    async fetchJoinableActiveGames(): Promise<IActiveGame[]> {
        return await activeGameModel.find({
            isFinished: false,
            turnOrder: { $size: 0 },
            $expr: {
                $lt: [{ $size: '$players' }, '$maxPlayerCount'],
            },
        });
    }

    private generateUniquePlayerName(newPlayerName: string, existingPlayers: ICharacter[]): string {
        // remove any existing -{number} suffix from malicious players
        newPlayerName = newPlayerName.trim().replace(/-\d+$/, '');
        const basis = 10;
        const regex = /^(.*)-(\d+)$/; // match "PlayerName - 1234" et capture "PlayerName" et "1234"
        let uniquePlayerIdToAppend = 1;

        existingPlayers.forEach((player) => {
            let name = player.name;
            let uniqueAddedId = null;

            const match = name.match(regex);
            if (match) {
                name = match[1].trim();
                uniqueAddedId = parseInt(match[2], basis);
            }

            if (name === newPlayerName) {
                uniquePlayerIdToAppend = Math.max(uniquePlayerIdToAppend, uniqueAddedId || 0) + 1;
            }
        });

        if (uniquePlayerIdToAppend > 1) {
            return `${newPlayerName}-${uniquePlayerIdToAppend}`;
        }
        return newPlayerName;
    }

    private createDefaultSanctuaryState(): Pick<ICharacter, 'fightSanctuaryUsed' | 'fightSanctuaryTurnsRemaining' | 'fightSanctuaryBonus'> {
        return {
            fightSanctuaryUsed: false,
            fightSanctuaryTurnsRemaining: 0,
            fightSanctuaryBonus: 0,
        };
    }

    async startCombat(activeGameId: string, attacker: string, defender: string): Promise<IActiveGame> {
        const activeGame = await activeGameModel.findById(activeGameId);
        if (!activeGame) {
            throw new Error(`Active game with id ${activeGameId} not found`);
        }

        const currentAttack: ICurrentAttack = {
            attacker,
            defender,
            turnCount: 1,
            attackerPosture: null,
            defenderPosture: null,

            suspendedTurnTimer: 0,
        };
        activeGame.currentAttack = currentAttack;
        return await activeGame.save();
    }

    async choosePosture(activeGameId: string, playerName: string, posture: AttackPosture): Promise<IActiveGame> {
        const activeGame = await activeGameModel.findById(activeGameId);
        if (!activeGame) {
            throw new Error(`Active game with id ${activeGameId} not found`);
        }

        const currentAttack = activeGame.currentAttack;
        if (!currentAttack) {
            throw new Error(`No ongoing attack in active game with id ${activeGameId}`);
        }

        if (currentAttack.attacker === playerName) {
            currentAttack.attackerPosture = posture;
        } else if (currentAttack.defender === playerName) {
            currentAttack.defenderPosture = posture;
        }

        return await activeGame.save();
    }
}
