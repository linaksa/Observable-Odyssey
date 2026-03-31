/**
 * Testing strategy — TileInfoService
 *
 * Approach:
 * - Keep each test focused on one behavior with deterministic mocks/spies.
 * - Validate both nominal flows and failure paths that could break UX/state.
 * - Assert side effects explicitly (state changes, emitted events, and service calls).
 *
 * Edge cases covered:
 * - Missing or invalid input guards and safe early returns.
 * - Error handling paths and fallback user-facing messaging.
 * - Cleanup/teardown behavior (unsubscribe/reset/disconnect) when applicable.
 */
import { TestBed } from '@angular/core/testing';
import { ITEM_INFO_BY_TYPE, TILE_INFO_BY_TYPE, UNKNOWN_TILE_INFO } from '@app/constants/tile-info';
import { CellType } from '@common/board';
import { Avatar, DiceType } from '@common/constants';
import { ItemType } from '@common/items';
import { TileInfoService } from './tile-info.service';

describe('TileInfoService', () => {
    let service: TileInfoService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [TileInfoService],
        });
        service = TestBed.inject(TileInfoService);
    });

    // Edge case: When an unknown tile type is requested, the service should return UNKNOWN_TILE_INFO while preserving known mappings.
    it('should return known tile info and fallback to unknown tile info', () => {
        expect(service.getTileInfo(CellType.Water)).toEqual(TILE_INFO_BY_TYPE[CellType.Water]);
        expect(service.getTileInfo('MYSTERY' as CellType)).toEqual(UNKNOWN_TILE_INFO);
    });

    it('should return item info for known items and null for null/unknown items', () => {
        expect(service.getItemInfo(null)).toBeNull();
        expect(service.getItemInfo({ x: 0, y: 0, size: 1, itemType: ItemType.Flag })).toEqual(ITEM_INFO_BY_TYPE[ItemType.Flag]);
        expect(service.getItemInfo({ x: 0, y: 0, size: 1, itemType: 'unknown-item' as ItemType })).toBeNull();
    });

    it('should return player info with avatar url and null when player is missing', () => {
        expect(service.getPlayerInfo(null)).toBeNull();

        expect(
            service.getPlayerInfo({
                name: 'Alice',
                avatar: Avatar.Avatar1,
                initialHealth: 6,
                currentHealth: 6,
                attackBonusDiceType: DiceType.FourSided,
                defenseBonusDiceType: DiceType.SixSided,
                rapidityPoints: 4,
                attackPoints: 4,
                defensePoints: 4,
                actionsLeft: 1,
                movementLeft: 2,
                victories: 0,
                hasAbandoned: false,
                positionDepart: { x: 0, y: 0 },
                positionGrille: { x: 0, y: 0 },
            }),
        ).toEqual({
            name: 'Alice',
            avatarUrl: './assets/characters/archer-portrait.png',
        });
    });
});
