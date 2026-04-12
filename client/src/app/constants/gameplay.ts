import { COMBAT_TIME_MS, MILLISECONDS_PER_SECOND } from '@common/constants';
import { AttackStats } from '@common/attackResult';

export const GAME_PAGE_RETURN_BUTTON_DELAY_MS = 3000;
export const GAME_COMBAT_OUTCOME_AUTO_CLOSE_MS = 3000;
export const GAME_SANCTUARY_OUTCOME_AUTO_CLOSE_MS = 3000;
export const FLAG_TRANSFER_POPUP_HEADER_LABEL = '⚑ Drapeau';
export const FLAG_TRANSFER_POPUP_WAITING_SUBTITLE = 'En attente de la réponse';
export const FLAG_TRANSFER_POPUP_WAITING_MESSAGE_PREFIX = 'En attente de la décision de';
export const FLAG_TRANSFER_ACCEPT_BUTTON_LABEL = 'Donner le drapeau';
export const FLAG_TRANSFER_ACCEPT_BUTTON_HINT = 'Le drapeau change de porteur';
export const FLAG_TRANSFER_REJECT_BUTTON_LABEL = 'Refuser';
export const FLAG_TRANSFER_REJECT_BUTTON_HINT = 'Le drapeau reste au porteur actuel';
export const FLAG_TRANSFER_REJECTED_TOAST = 'Le transfert du drapeau a été refusé.';
export const FLAG_TRANSFER_SELF_REJECTED_TOAST = 'Vous avez refusé le transfert du drapeau.';
export const GAME_COMBAT_DEFAULT_DIALOG_MESSAGE = 'Que ferez-vous ?';
export const GAME_COMBAT_DEFENSIVE_SELECTED_MESSAGE = 'Mode défensif sélectionné...';
export const GAME_COMBAT_OFFENSIVE_SELECTED_MESSAGE = 'Mode offensif sélectionné...';
export const GAME_COMBAT_DEFENSIVE_CONFIRMED_MESSAGE = 'Posture défensive adoptée !';
export const GAME_COMBAT_OFFENSIVE_CONFIRMED_MESSAGE = 'Attaque préparée !';
export const COMBAT_DURATION_SECONDS = COMBAT_TIME_MS / MILLISECONDS_PER_SECOND;

export const GAME_COMBAT_TURN_RESULT_PLACEHOLDER_STATS: AttackStats = {
    baseAttackPoints: 0,
    baseDefensePoints: 0,
    attackDiceBonus: 0,
    defenseDiceBonus: 0,
    postureAttackBonus: 0,
    postureDefenseBonus: 0,
    fightSanctuaryBonus: 0,
    attackIceMalus: 0,
    defenseIceMalus: 0,
    totalAttackPoints: 0,
    totalDefensePoints: 0,
};
