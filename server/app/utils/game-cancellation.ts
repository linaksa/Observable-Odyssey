import { type EndGameReason } from '@app/services/gameplay/end-game.service';
import { type GameCanceledReason } from '@common/socket-payloads';

export function toGameCanceledReason(reason: EndGameReason | null): GameCanceledReason | undefined {
    switch (reason) {
        case 'insufficient-active-players':
        case 'no-human-players':
        case 'ctf-team-eliminated':
            return reason;
        default:
            return undefined;
    }
}
