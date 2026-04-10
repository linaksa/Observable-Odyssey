import { ICharacter } from '@common/character';

export function formatPlayerStatValue(player: ICharacter | null | undefined, value: number | undefined): string {
    if (!player || value === undefined) {
        return '—';
    }

    return String(value);
}
