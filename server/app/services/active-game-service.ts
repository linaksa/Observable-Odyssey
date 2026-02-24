import { activeGame } from '@app/schemas/active-game';
import { IExistingGame } from '@common/game';
import { Service } from 'typedi';

@Service()
export class ActiveGameService {

    fetchJoinableActiveGames(): Promise<IExistingGame[]> {
        return activeGame.find({});
    }
}