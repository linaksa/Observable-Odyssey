import { Injectable } from '@angular/core';
import { IItem, ItemType } from '@common/items';
import { isPositionAdjacentToSanctuary, sanctuaryCoversCell } from '@app/utils/sanctuary';

@Injectable({
    providedIn: 'root',
})
export class BoardSharedService {
    cellBelongsToObject(obj: IItem, row: number, col: number): boolean {
        if (obj.itemType === ItemType.LifeSanctuary || obj.itemType === ItemType.FightSanctuary) {
            return sanctuaryCoversCell(obj, row, col);
        }

        return obj.x === row && obj.y === col;
    }

    getObjectAt(row: number, col: number, objects: IItem[]): IItem | null {
        return objects.find((obj) => this.cellBelongsToObject(obj, row, col)) ?? null;
    }

    isAdjacentToObject(obj: IItem, row: number, col: number): boolean {
        if (obj.itemType === ItemType.LifeSanctuary || obj.itemType === ItemType.FightSanctuary) {
            return isPositionAdjacentToSanctuary({ x: col, y: row }, obj);
        }

        return Math.abs(obj.x - row) + Math.abs(obj.y - col) === 1;
    }
}
