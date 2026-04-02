import { Position } from './character';
import { IFightSanctuary, IItem, ILifeSanctuary, ItemType } from './items';

export const SANCTUARY_COOLDOWN_TURN_STEPS = 3;

export function isSanctuaryItem(item: IItem | null | undefined): item is ILifeSanctuary | IFightSanctuary {
    return item?.itemType === ItemType.LifeSanctuary || item?.itemType === ItemType.FightSanctuary;
}

export function sanctuaryCoversCell(item: IItem, row: number, col: number): boolean {
    if (!isSanctuaryItem(item)) {
        return false;
    }

    return row >= item.x && row <= item.x + 1 && col >= item.y && col <= item.y + 1;
}

export function isPositionAdjacentToSanctuary(position: Position, sanctuary: IItem): boolean {
    if (!isSanctuaryItem(sanctuary)) {
        return false;
    }

    const isWithinSanctuaryRows = position.y >= sanctuary.x && position.y <= sanctuary.x + 1;
    const isWithinSanctuaryColumns = position.x >= sanctuary.y && position.x <= sanctuary.y + 1;

    return (
        (position.x === sanctuary.y - 1 && isWithinSanctuaryRows) ||
        (position.x === sanctuary.y + 2 && isWithinSanctuaryRows) ||
        (position.y === sanctuary.x - 1 && isWithinSanctuaryColumns) ||
        (position.y === sanctuary.x + 2 && isWithinSanctuaryColumns)
    );
}

export function isSanctuaryActive(item: IItem | null | undefined): item is ILifeSanctuary | IFightSanctuary {
    return isSanctuaryItem(item) && item.active !== false && (item.inactiveTurnsRemaining ?? 0) <= 0;
}

export function deactivateSanctuary(item: IItem): void {
    if (!isSanctuaryItem(item)) {
        return;
    }

    item.active = false;
    item.inactiveTurnsRemaining = SANCTUARY_COOLDOWN_TURN_STEPS;
}

export function advanceSanctuaryCooldowns(items: IItem[]): void {
    for (const item of items) {
        if (!isSanctuaryItem(item)) {
            continue;
        }

        const remainingTurns = item.inactiveTurnsRemaining ?? 0;

        if (item.active !== false && remainingTurns <= 0) {
            continue;
        }

        if (remainingTurns <= 1) {
            item.active = true;
            delete item.inactiveTurnsRemaining;
            continue;
        }

        item.active = false;
        item.inactiveTurnsRemaining = remainingTurns - 1;
    }
}
