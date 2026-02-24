import { activeGame } from '@app/schemas/active-game';
import { IActiveGame } from '@common/activeGame';
import { INewMessage } from '@common/message';
import { Service } from 'typedi';

@Service()
export class ActiveGameService {
    async createActiveGame(activeGameData: IActiveGame): Promise<IActiveGame> {
        return await activeGame.create(activeGameData);
    }

    async getAllActiveGames(): Promise<IActiveGame[]> {
        return await activeGame.find().exec();
    }

    async addMessageToGame(message: INewMessage): Promise<IActiveGame | null> {
        return await activeGame.findOneAndUpdate({ _id: message.roomId }, { $push: { messages: message } }, { new: true }).exec();
    }
}
