/**
 * Testing strategy — Game Popup State Service
 *
 * Approach:
 * - Validate sanctuary popup data is derived from item metadata.
 * - Keep the tests focused on the data contract used by the popup component.
 */
import { TestBed } from '@angular/core/testing';
import { TileInfoService } from '@app/services/ui/tile-info.service';
import { IItem, ItemType } from '@common/items';
import { GamePopupStateService } from './game-popup-state.service';

describe('GamePopupStateService', () => {
    const SANCTUARY_ROW = 4;
    const SANCTUARY_COLUMN = 5;
    let service: GamePopupStateService;
    let tileInfoServiceSpy: jasmine.SpyObj<TileInfoService>;

    beforeEach(() => {
        tileInfoServiceSpy = jasmine.createSpyObj<TileInfoService>('TileInfoService', ['getTileInfo', 'getItemInfo', 'getPlayerInfo']);
        tileInfoServiceSpy.getItemInfo.and.returnValue({ title: 'Sanctuaire de combat', description: "Donne un buff d'attaque et de défense." });

        TestBed.configureTestingModule({
            providers: [{ provide: TileInfoService, useValue: tileInfoServiceSpy }],
        });

        service = TestBed.inject(GamePopupStateService);
    });

    it('should keep fight sanctuary popup choices available even with an active player buff', () => {
        service.openSanctuaryPopup(createItem(ItemType.FightSanctuary), SANCTUARY_ROW, SANCTUARY_COLUMN);

        const data = service.sanctuaryPopupData;

        expect(data.visible).toBeTrue();
        expect(data.description).toContain("Donne un buff d'attaque et de défense.");
        expect(data.effectLabel).toContain('Ajoute +1 ATQ / +1 DEF');
    });

    it('should set fight sanctuary popup text from sanctuary metadata', () => {
        service.openSanctuaryPopup(createItem(ItemType.FightSanctuary), SANCTUARY_ROW, SANCTUARY_COLUMN);

        const data = service.sanctuaryPopupData;

        expect(data.visible).toBeTrue();
        expect(data.description).toContain("Donne un buff d'attaque et de défense.");
        expect(data.effectLabel).toContain('Ajoute +1 ATQ / +1 DEF');
    });

    it('should keep popup available when sanctuary is active despite a stale cooldown counter', () => {
        service.openSanctuaryPopup(createItem(ItemType.FightSanctuary, { active: true, inactiveTurnsRemaining: 1 }), SANCTUARY_ROW, SANCTUARY_COLUMN);

        const data = service.sanctuaryPopupData;
        expect(data.visible).toBeTrue();
        expect(data.effectLabel).toContain('Ajoute +1 ATQ / +1 DEF');
    });

    function createItem(itemType: ItemType, overrides: Partial<IItem> = {}): IItem {
        return {
            itemType,
            x: 5,
            y: 4,
            size: 4,
            active: true,
            ...overrides,
        };
    }
});
