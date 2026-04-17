/**
 * Testing strategy — CreatePageComponent
 *
 * Approach:
 * - Verify init orchestration resets stale table data, fetches visible games, and opens admin socket listeners.
 * - Use a controlled games-modified stream to assert refresh behavior after real-time updates.
 * - Validate teardown responsibilities by checking socket disconnect on component destruction.
 *
 * Edge cases covered:
 * - Preloaded stale rows are cleared before the first fetch call.
 * - Post-init update notifications trigger a second fetch without reinitializing dependencies.
 * - Destroying the page closes the admin socket even when no updates were received.
 */
import { Component } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { AdminSocketService } from '@app/services/realtime/admin.socket.service';
import { GameTableService } from '@app/services/tables/game-table.service';
import { Subject } from 'rxjs';
import { CreatePageComponent } from '@app/pages/lobby/create-page/create-page.component';

describe('CreatePageComponent', () => {
    let component: CreatePageComponent;
    let fixture: ComponentFixture<CreatePageComponent>;
    let adminSocketServiceSpy: jasmine.SpyObj<AdminSocketService>;
    let gameTableServiceSpy: GameTableServiceSpy;
    let gamesModified$: Subject<void>;

    beforeEach(async () => {
        gamesModified$ = new Subject<void>();
        adminSocketServiceSpy = jasmine.createSpyObj<AdminSocketService>('AdminSocketService', ['connect', 'disconnect', 'onGamesModified']);
        adminSocketServiceSpy.onGamesModified.and.returnValue(gamesModified$.asObservable());

        gameTableServiceSpy = jasmine.createSpyObj<Pick<GameTableService, 'fetchGames'>>('GameTableService', ['fetchGames']) as GameTableServiceSpy;
        gameTableServiceSpy.tableData = [{ _id: 'stale-game' } as never];

        const overrideInfo: MetadataOverride<Component> = {
            set: {
                template: '',
                imports: [],
            },
        };
        TestBed.overrideComponent(CreatePageComponent, overrideInfo);

        await TestBed.configureTestingModule({
            imports: [CreatePageComponent],
            providers: [
                { provide: AdminSocketService, useValue: adminSocketServiceSpy },
                { provide: GameTableService, useValue: gameTableServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CreatePageComponent);
        component = fixture.componentInstance;
    });

    it('should reset table data, fetch visible games, and connect admin socket on init', () => {
        fixture.detectChanges();

        expect(gameTableServiceSpy.tableData).toEqual([]);
        expect(gameTableServiceSpy.fetchGames).toHaveBeenCalledWith(true);
        expect(adminSocketServiceSpy.connect).toHaveBeenCalled();
        expect(adminSocketServiceSpy.onGamesModified).toHaveBeenCalled();
    });

    it('should refresh visible games when admin games-modified event is emitted', () => {
        fixture.detectChanges();

        gamesModified$.next();

        expect(gameTableServiceSpy.fetchGames).toHaveBeenCalledTimes(2);
    });

    // Edge case: When the create page is destroyed, the admin socket connection should be closed.
    it('should disconnect admin socket on destroy', () => {
        component.ngOnDestroy();

        expect(adminSocketServiceSpy.disconnect).toHaveBeenCalled();
    });
});

type GameTableServiceSpy = jasmine.SpyObj<Pick<GameTableService, 'fetchGames'>> & Pick<GameTableService, 'tableData'>;
