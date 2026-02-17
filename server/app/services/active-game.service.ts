import { activeGame } from '@app/schemas/active-game';
import { IActiveGame } from '@common/activeGame';
import { Service } from 'typedi';

@Service()
export class ActiveGameService {
    async createActiveGame(activeGameData: IActiveGame): Promise<IActiveGame> {
        return await activeGame.create(activeGameData);
    }

    async getAllActiveGames(): Promise<IActiveGame[]> {
        return await activeGame.find().exec();
    }
}
