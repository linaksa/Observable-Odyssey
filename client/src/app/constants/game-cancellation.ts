import { type GameCanceledReason } from '@common/socket-payloads';

const organizerLeftWaitingRoomReason: GameCanceledReason = 'organizer-left-waiting-room';
const insufficientActivePlayersReason: GameCanceledReason = 'insufficient-active-players';
const noHumanPlayersReason: GameCanceledReason = 'no-human-players';
const ctfTeamEliminatedReason: GameCanceledReason = 'ctf-team-eliminated';

export const GAME_CANCELED_DEFAULT_TOAST = "L'organiseur a annulé la partie.";

export const GAME_CANCELED_TOAST_BY_REASON: Record<GameCanceledReason, string> = {
    [organizerLeftWaitingRoomReason]: GAME_CANCELED_DEFAULT_TOAST,
    [insufficientActivePlayersReason]: 'Partie annulée: pas assez de joueurs actifs pour continuer (pas de gagnant clair).',
    [noHumanPlayersReason]: 'Partie annulée: il ne reste plus de joueurs humains (pas de gagnant clair).',
    [ctfTeamEliminatedReason]: "Partie annulée: une équipe n'a plus de joueur (pas de gagnant clair).",
};

export const GAME_CANCELED_DEFAULT_END_MESSAGE = 'Pas de gagnant clair.';

export const GAME_CANCELED_END_MESSAGE_BY_REASON: Record<GameCanceledReason, string> = {
    [organizerLeftWaitingRoomReason]: "Pas de gagnant clair: l'organisateur a annulé la partie.",
    [insufficientActivePlayersReason]: 'Pas de gagnant clair: il ne reste pas assez de joueurs actifs.',
    [noHumanPlayersReason]: 'Pas de gagnant clair: il ne reste plus de joueur humain.',
    [ctfTeamEliminatedReason]: "Pas de gagnant clair: une équipe n'a plus de joueur actif.",
};

export const GAME_ENDED_REDIRECT_TO_HOME_MESSAGE = 'Redirection automatique vers la vue initiale';
export const GAME_ENDED_REDIRECT_TO_STATS_MESSAGE = 'Redirection automatique vers les statistiques de fin de partie';
