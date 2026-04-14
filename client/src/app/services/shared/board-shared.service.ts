import { Injectable } from '@angular/core';
import { isPositionAdjacentToSanctuary, sanctuaryCoversCell } from '@app/utils/sanctuary';
import { IItem, ItemType } from '@common/items';

@Injectable({
    providedIn: 'root',
})
export class BoardSharedService {
    cellBelongsToObject(obj: IItem, row: number, col: number): boolean {
        if (obj.isCarried) return false;

        if (obj.itemType === ItemType.LifeSanctuary || obj.itemType === ItemType.FightSanctuary) {
            return sanctuaryCoversCell(obj, row, col);
        }

        return obj.x === col && obj.y === row;
    }

    getObjectAt(row: number, col: number, objects: IItem[]): IItem | null {
        return objects.find((obj) => this.cellBelongsToObject(obj, row, col)) ?? null;
    }

    isAdjacentToObject(obj: IItem, row: number, col: number): boolean {
        if (obj.itemType === ItemType.LifeSanctuary || obj.itemType === ItemType.FightSanctuary) {
            return isPositionAdjacentToSanctuary({ x: col, y: row }, obj);
        }

        return Math.abs(obj.x - col) + Math.abs(obj.y - row) === 1;
    }
}
