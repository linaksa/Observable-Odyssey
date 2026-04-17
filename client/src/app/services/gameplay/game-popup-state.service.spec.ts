/**
 * Testing strategy — GamePopupStateService
 *
 * Approach:
 * - Open each popup type through service methods and assert the resulting signal payload contracts.
 * - Validate tile/item/player metadata composition using deterministic sanctuary and player fixtures.
 *
 * Edge cases covered:
 * - Active sanctuaries remain interactable even if stale cooldown counters exist client-side.
 * - Missing item/player metadata falls back to null values without crashing popup state.
 */
import { TestBed } from '@angular/core/testing';
import { CellType } from '@common/board';
import { Avatar, DiceType } from '@common/constants';
import { ICharacter } from '@common/character';
import { TileInfoService } from '@app/services/ui/tile-info.service';
import { IItem, ItemType } from '@common/items';
import { GamePopupStateService } from '@app/services/gameplay/game-popup-state.service';

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
        // Edge case: existing buffs must not hide sanctuary choices.
        service.openSanctuaryPopup(createItem(ItemType.FightSanctuary), SANCTUARY_ROW, SANCTUARY_COLUMN);

        const data = service.sanctuaryPopupData;

        expect(data.visible).toBeTrue();
        expect(data.description).toContain("Donne un buff d'attaque et de défense.");
        expect(data.effectLabel).toContain('Ajoute +1 ATQ / +1 DEF');
    });

    it('should set fight sanctuary popup text from sanctuary metadata', () => {
        // Nominal case: popup copy is derived from sanctuary metadata.
        service.openSanctuaryPopup(createItem(ItemType.FightSanctuary), SANCTUARY_ROW, SANCTUARY_COLUMN);

        const data = service.sanctuaryPopupData;

        expect(data.visible).toBeTrue();
        expect(data.description).toContain("Donne un buff d'attaque et de défense.");
        expect(data.effectLabel).toContain('Ajoute +1 ATQ / +1 DEF');
    });

    it('should keep popup available when sanctuary is active despite a stale cooldown counter', () => {
        // Edge case: stale cooldown values should not override an active sanctuary.
        service.openSanctuaryPopup(createItem(ItemType.FightSanctuary, { active: true, inactiveTurnsRemaining: 1 }), SANCTUARY_ROW, SANCTUARY_COLUMN);

        const data = service.sanctuaryPopupData;
        expect(data.visible).toBeTrue();
        expect(data.effectLabel).toContain('Ajoute +1 ATQ / +1 DEF');
    });

    it('should show object metadata for regular items and keep the player separate', () => {
        // Nominal case: regular items show their own metadata while player info stays in player fields.
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
        // Edge case: starting-position labels include the player name without losing player card details.
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
/* Merged from game-popup-state.service.extra.spec.ts */

(() => {
    describe('GamePopupStateService (extra)', () => {
        const SANCTUARY_ROW = 2;
        const SANCTUARY_COL = 3;

        let service: GamePopupStateService;
        let tileInfoServiceSpy: jasmine.SpyObj<TileInfoService>;

        beforeEach(() => {
            tileInfoServiceSpy = jasmine.createSpyObj<TileInfoService>('TileInfoService', ['getTileInfo', 'getItemInfo', 'getPlayerInfo']);
            tileInfoServiceSpy.getTileInfo.and.returnValue({
                title: 'Tuile',
                description: 'Description de tuile',
                movementCost: '1',
            });
            tileInfoServiceSpy.getItemInfo.and.returnValue(null);
            tileInfoServiceSpy.getPlayerInfo.and.returnValue(null);

            TestBed.configureTestingModule({
                providers: [{ provide: TileInfoService, useValue: tileInfoServiceSpy }],
            });

            service = TestBed.inject(GamePopupStateService);
        });

        it('falls back to null item/player metadata when tile info is opened without item or player', () => {
            // Edge case: no item and no player metadata should stay null-safe.
            service.openTileInfo(CellType.Empty, null, null);

            expect(service.tileInfoPopupData).toEqual({
                visible: true,
                title: 'Tuile',
                description: 'Description de tuile',
                movementCost: '1',
                itemTitle: null,
                itemDescription: null,
                playerName: null,
                playerAvatarUrl: null,
            });
        });

        it('uses default sanctuary labels when metadata is unavailable and supports life sanctuary effect text', () => {
            // Edge case: missing sanctuary metadata should use default title/description.
            service.openSanctuaryPopup(createItem(ItemType.LifeSanctuary), SANCTUARY_ROW, SANCTUARY_COL);

            expect(service.sanctuaryPopupData).toEqual({
                visible: true,
                title: 'Sanctuaire',
                description: 'Choisissez un bonus.',
                effectLabel: 'Soigne 2 PV, ou 4 PV si le 2x réussit.',
            });
            expect(service.sanctuaryPopupPosition).toEqual({ x: SANCTUARY_COL, y: SANCTUARY_ROW });
        });

        it('closes sanctuary popup and resets all related fields', () => {
            tileInfoServiceSpy.getItemInfo.and.returnValue({ title: 'Sanctuaire', description: 'Bonus' });
            service.openSanctuaryPopup(createItem(ItemType.FightSanctuary), 1, 1);

            // Nominal case: closing sanctuary popup clears both content and coordinates.
            service.closeSanctuaryPopup();

            expect(service.sanctuaryPopupData).toEqual({
                visible: false,
                title: '',
                description: '',
                effectLabel: '',
            });
            expect(service.sanctuaryPopupPosition).toBeNull();
        });

        it('closes all popups at once', () => {
            tileInfoServiceSpy.getItemInfo.and.returnValues(
                { title: 'Drapeau', description: 'Objectif' },
                { title: 'Sanctuaire', description: 'Bonus' },
            );
            service.openTileInfo(CellType.Empty, createItem(ItemType.Flag), null);
            service.openSanctuaryPopup(createItem(ItemType.FightSanctuary), 0, 0);

            // Nominal case: global close resets tile and sanctuary popups together.
            service.closeAllPopups();

            expect(service.tileInfoPopupData.visible).toBeFalse();
            expect(service.tileInfoPopupData.itemTitle).toBeNull();
            expect(service.tileInfoPopupData.playerName).toBeNull();
            expect(service.sanctuaryPopupData.visible).toBeFalse();
            expect(service.sanctuaryPopupPosition).toBeNull();
        });

        it('keeps starting-position item title unchanged when no spawn owner name is provided', () => {
            tileInfoServiceSpy.getItemInfo.and.returnValue({ title: 'Position de depart', description: 'Spawn' });

            // Edge case: absent spawn owner must not alter the base item title.
            service.openTileInfo(CellType.Empty, createItem(ItemType.StartingPosition), null, null);

            expect(service.tileInfoPopupData.itemTitle).toBe('Position de depart');
        });
    });

    function createItem(itemType: ItemType): IItem {
        return {
            itemType,
            x: 1,
            y: 1,
            size: 4,
            active: true,
        };
    }
})();
