/**
 * Testing strategy — Global Stats Component
 *
 * Approach:
 * - Inject a spy-based global stats service and validate each computed getter.
 * - Cover both applicable and non-applicable stat display paths.
 *
 * Edge cases covered:
 * - Invalid/missing dates should fallback to 00:00 duration.
 * - Zero terrain/door/sanctuary counts should return guarded display values.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GlobalStatsService } from '@app/services/end/global-stats.service';
import { CellType } from '@common/board';
import { IActiveGame } from '@common/active-game';
import { ItemType } from '@common/items';
import { GlobalStatsComponent } from './global-stats.component';

const SANCTUARY_TOTAL = 4;
const TERRAIN_TOTAL = 20;
const TERRAIN_VISITED = 5;
const DOOR_TOTAL = 10;
const TURN_COUNT = 12;

describe('GlobalStatsComponent', () => {
    let component: GlobalStatsComponent;
    let fixture: ComponentFixture<GlobalStatsComponent>;
    let globalStatsServiceSpy: jasmine.SpyObj<GlobalStatsService>;

    const activeGame = {
        _id: 'game-1',
        createdAt: new Date('2024-01-01T10:00:00.000Z'),
        startedAt: new Date('2024-01-01T10:00:00.000Z'),
        endedAt: new Date('2024-01-01T10:05:09.000Z'),
        totalTurnCount: 12,
        usedSanctuaries: ['a', 'a', 'b'],
        manipulatedDoors: ['1,1', '2,2', '2,2'],
        flagHolderHistory: ['Alice', 'Alice', 'Bob'],
        game: {
            board: {
                cells: [[CellType.Empty, CellType.OpenDoor]],
                items: [{ itemType: ItemType.Flag }],
            },
        },
    } as unknown as IActiveGame;

    beforeEach(async () => {
        globalStatsServiceSpy = jasmine.createSpyObj<GlobalStatsService>('GlobalStatsService', [
            'getTotalSanctuaryCount',
            'getTotalTerrainTileCount',
            'getVisitedTerrainTileCount',
            'getTotalDoorCount',
        ]);

        globalStatsServiceSpy.getTotalSanctuaryCount.and.returnValue(SANCTUARY_TOTAL);
        globalStatsServiceSpy.getTotalTerrainTileCount.and.returnValue(TERRAIN_TOTAL);
        globalStatsServiceSpy.getVisitedTerrainTileCount.and.returnValue(TERRAIN_VISITED);
        globalStatsServiceSpy.getTotalDoorCount.and.returnValue(DOOR_TOTAL);

        TestBed.overrideComponent(GlobalStatsComponent, { set: { template: '' } });

        await TestBed.configureTestingModule({
            imports: [GlobalStatsComponent],
            providers: [{ provide: GlobalStatsService, useValue: globalStatsServiceSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(GlobalStatsComponent);
        component = fixture.componentInstance;
        component.activeGame = activeGame;
        fixture.detectChanges();
    });

    it('should compute game duration and total turn count with safe fallback', () => {
        expect(component.gameDurationFormatted).toBe('05:09');
        expect(component.totalTurnCount).toBe(TURN_COUNT);

        // Edge case: invalid dates fall back to zero duration.
        component.activeGame = {
            ...activeGame,
            startedAt: 'invalid-date',
            endedAt: null,
        } as unknown as IActiveGame;
        expect(component.gameDurationFormatted).toBe('00:00');

        component.activeGame = { ...activeGame, totalTurnCount: undefined } as unknown as IActiveGame;
        expect(component.totalTurnCount).toBe(0);
    });

    it('should compute sanctuary usage applicability and formatting', () => {
        // Nominal case: applicable sanctuary usage percentage.
        globalStatsServiceSpy.getTotalSanctuaryCount.and.returnValue(SANCTUARY_TOTAL);
        expect(component.sanctuaryUsageApplicable).toBeTrue();
        expect(component.sanctuaryUsageFormatted).toBe('50.0%');

        component.activeGame = { ...activeGame, usedSanctuaries: undefined } as unknown as IActiveGame;
        expect(component.sanctuaryUsageFormatted).toBe('0.0%');

        // Edge case: no sanctuaries should render N/A.
        globalStatsServiceSpy.getTotalSanctuaryCount.and.returnValue(0);
        expect(component.sanctuaryUsageApplicable).toBeFalse();
        expect(component.sanctuaryUsageFormatted).toBe('N/A');
    });

    it('should compute visited terrain ratio and handle zero-terrain maps', () => {
        globalStatsServiceSpy.getTotalTerrainTileCount.and.returnValue(TERRAIN_TOTAL);
        globalStatsServiceSpy.getVisitedTerrainTileCount.and.returnValue(TERRAIN_VISITED);
        expect(component.visitedTerrainFormatted).toBe('25.0%');

        globalStatsServiceSpy.getTotalTerrainTileCount.and.returnValue(0);
        expect(component.visitedTerrainFormatted).toBe('0%');
    });

    it('should compute door manipulation applicability and formatting', () => {
        globalStatsServiceSpy.getTotalDoorCount.and.returnValue(DOOR_TOTAL);
        expect(component.doorManipulationApplicable).toBeTrue();
        expect(component.doorManipulationFormatted).toBe('20.0%');

        component.activeGame = { ...activeGame, manipulatedDoors: undefined } as unknown as IActiveGame;
        expect(component.doorManipulationFormatted).toBe('0.0%');

        globalStatsServiceSpy.getTotalDoorCount.and.returnValue(0);
        expect(component.doorManipulationApplicable).toBeFalse();
        expect(component.doorManipulationFormatted).toBe('N/A');
    });

    it('should compute flag-holder applicability and unique holder count', () => {
        expect(component.flagHolderApplicable).toBeTrue();
        expect(component.flagHolderCount).toBe(2);

        component.activeGame = { ...activeGame, flagHolderHistory: undefined } as unknown as IActiveGame;
        expect(component.flagHolderCount).toBe(0);

        component.activeGame = {
            ...activeGame,
            game: {
                board: {
                    cells: [[CellType.Empty]],
                    items: [],
                },
            },
        } as unknown as IActiveGame;

        expect(component.flagHolderApplicable).toBeFalse();
        expect(component.flagHolderCount).toBeNull();
    });
});
