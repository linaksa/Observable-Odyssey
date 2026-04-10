import { COMBAT_TIME_MS, MILLISECONDS_PER_SECOND } from '@common/constants';

export const GAME_PAGE_RETURN_BUTTON_DELAY_MS = 3000;
export const GAME_COMBAT_OUTCOME_AUTO_CLOSE_MS = 3000;
export const GAME_COMBAT_DEFAULT_DIALOG_MESSAGE = 'Que ferez-vous ?';
export const GAME_COMBAT_DEFENSIVE_SELECTED_MESSAGE = 'Mode défensif sélectionné...';
export const GAME_COMBAT_OFFENSIVE_SELECTED_MESSAGE = 'Mode offensif sélectionné...';
export const GAME_COMBAT_DEFENSIVE_CONFIRMED_MESSAGE = 'Posture défensive adoptée !';
export const GAME_COMBAT_OFFENSIVE_CONFIRMED_MESSAGE = 'Attaque préparée !';
export const COMBAT_DURATION_SECONDS = COMBAT_TIME_MS / MILLISECONDS_PER_SECOND;
