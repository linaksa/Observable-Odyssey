/**
 * Testing strategy — Game Popup State Service
 *
 * Approach:
 * - Validate tile popup data is derived from item metadata.
 * - Keep the tests focused on the data contract used by the popup component.
 */
import { TestBed } from '@angular/core/testing';
import { CellType } from '@common/board';
import { Avatar, DiceType } from '@common/constants';
import { ICharacter } from '@common/character';
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
        tileInfoServiceSpy.getTileInfo.and.returnValue({
            title: 'Tuile de base',
            description: 'Terrain libre et traversable.',
            movementCost: '1 point de mouvement.',
        });
        tileInfoServiceSpy.getItemInfo.and.callFake((item) => {
            switch (item?.itemType) {
                case ItemType.FightSanctuary:
                    return { title: 'Sanctuaire de combat', description: "Donne un buff d'attaque et de défense." };
                case ItemType.LifeSanctuary:
                    return { title: 'Sanctuaire de vie', description: 'Soigne le joueur de 2 points de vie.' };
                case ItemType.StartingPosition:
                    return { title: 'Position de depart', description: "Case d'apparition d'un joueur." };
                case ItemType.Flag:
                    return { title: 'Drapeau', description: 'Objectif principal du mode CTF.' };
                default:
                    return null;
            }
        });
        tileInfoServiceSpy.getPlayerInfo.and.callFake((player) =>
            player
                ? {
                      name: player.name,
                      avatarUrl: './assets/characters/archer-portrait.png',
                  }
                : null,
        );

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

    it('should show object metadata for regular items and keep the player separate', () => {
        const player = createPlayer();

        service.openTileInfo(CellType.Empty, createItem(ItemType.Flag), player);

        const data = service.tileInfoPopupData;

        expect(data.visible).toBeTrue();
        expect(data.itemTitle).toBe('Drapeau');
        expect(data.itemDescription).toBe('Objectif principal du mode CTF.');
        expect(data.playerName).toBe('Alice');
        expect(data.playerAvatarUrl).toBe('./assets/characters/archer-portrait.png');
    });

    it('should append the player name to spawn points and still show the player block', () => {
        const player = createPlayer();

        service.openTileInfo(CellType.Empty, createItem(ItemType.StartingPosition), player, 'Alice');

        const data = service.tileInfoPopupData;

        expect(data.visible).toBeTrue();
        expect(data.itemTitle).toBe('Position de depart (Alice)');
        expect(data.itemDescription).toBe("Case d'apparition d'un joueur.");
        expect(data.playerName).toBe('Alice');
        expect(data.playerAvatarUrl).toBe('./assets/characters/archer-portrait.png');
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

    function createPlayer(): ICharacter {
        return {
            name: 'Alice',
            avatar: Avatar.Avatar1,
            initialHealth: 10,
            currentHealth: 10,
            attackBonusDiceType: DiceType.FourSided,
            defenseBonusDiceType: DiceType.SixSided,
            rapidityPoints: 4,
            attackPoints: 4,
            defensePoints: 4,
            actionsLeft: 1,
            movementLeft: 4,
            victories: 0,
            hasAbandoned: false,
            startingPosition: { x: SANCTUARY_COLUMN, y: SANCTUARY_ROW },
            currentPosition: { x: SANCTUARY_COLUMN, y: SANCTUARY_ROW },
            nCombats: 0,
            nVictories: 0,
            nDefeats: 0,
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            visitedCells: [],
        };
    }
});
