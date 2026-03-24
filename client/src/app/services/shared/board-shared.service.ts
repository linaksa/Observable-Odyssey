import { Injectable } from '@angular/core';
import { IItem, ItemType } from '@common/items';

@Injectable({
    providedIn: 'root',
})
export class BoardSharedService {
    cellBelongsToObject(obj: IItem, row: number, col: number): boolean {
        if (obj.isCarried) return false;

        if (obj.itemType === ItemType.LifeSanctuary || obj.itemType === ItemType.FightSanctuary) {
            return row >= obj.x && row <= obj.x + 1 && col >= obj.y && col <= obj.y + 1;
        }
        return obj.x === row && obj.y === col;
    }

    getObjectAt(row: number, col: number, objects: IItem[]): IItem | null {
        return objects.find((obj) => this.cellBelongsToObject(obj, row, col)) ?? null;
    }
}
