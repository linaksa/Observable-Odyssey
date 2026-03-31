/**
 * Testing strategy — JoinPageComponent
 *
 * Summary:
 * - Validate lifecycle wiring on `ngOnInit`: stale table reset, initial data fetch,
 *   socket connection, and subscription registration.
 * - Validate event-driven refresh behavior: each `JoinableGamesUpdated` event triggers
 *   a new fetch.
 * - Validate `ngOnDestroy` teardown: the active-game namespace is disconnected.
 *
 * Approach:
 * - Isolate class behavior with Jasmine spies for `ActiveGameTableService` and
 *   `SocketService` (no HTTP or real sockets).
 * - Override standalone template/imports to remove child-component dependencies and
 *   keep assertions focused on lifecycle logic.
 * - Drive socket updates with an RxJS `Subject<void>` to deterministically test
 *   subscription behavior.
 *
 * Edge cases covered:
 * 1) Existing stale rows are cleared before the first refresh.
 * 2) A socket update increments fetch calls from 1 to 2.
 * 3) Destroy always disconnects from `Namespaces.ActiveGameAdmin`.
 */
import { Component } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { SocketService } from '@app/services/realtime/socket.service';
import { ActiveGameTableService } from '@app/services/tables/active-game-table.service';
import { IActiveGame } from '@common/activeGame';
import { IGame } from '@common/game';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { Subject } from 'rxjs';
import { JoinPageComponent } from './join-page.component';
import SpyObj = jasmine.SpyObj;

describe('JoinPageComponent', () => {
    let component: JoinPageComponent;
    let fixture: ComponentFixture<JoinPageComponent>;
    let activeGameTableServiceSpy: ActiveGameTableServiceSpy;
    let socketServiceSpy: SpyObj<SocketService>;
    let joinableGamesUpdated$: Subject<void>;

    beforeEach(async () => {
        joinableGamesUpdated$ = new Subject<void>();

        activeGameTableServiceSpy = jasmine.createSpyObj<Pick<ActiveGameTableService, 'fetchJoinableActiveGames'>>('ActiveGameTableService', [
            'fetchJoinableActiveGames',
        ]) as ActiveGameTableServiceSpy;
        activeGameTableServiceSpy.tableData = [createActiveGame('stale-active-game')];

        socketServiceSpy = jasmine.createSpyObj('SocketService', ['connect', 'on', 'disconnect']);
        socketServiceSpy.on.and.returnValue(joinableGamesUpdated$.asObservable());

        const overrideInfo: MetadataOverride<Component> = {
            set: {
                template: '',
                imports: [],
            },
        };
        TestBed.overrideComponent(JoinPageComponent, overrideInfo);

        await TestBed.configureTestingModule({
            imports: [JoinPageComponent],
            providers: [
                { provide: ActiveGameTableService, useValue: activeGameTableServiceSpy },
                { provide: SocketService, useValue: socketServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(JoinPageComponent);
        component = fixture.componentInstance;
    });

    it('should clear table data, fetch joinable games, and subscribe on init', () => {
        fixture.detectChanges();

        expect(activeGameTableServiceSpy.tableData).toEqual([]);
        expect(activeGameTableServiceSpy.fetchJoinableActiveGames).toHaveBeenCalledTimes(1);
        expect(socketServiceSpy.connect).toHaveBeenCalledWith(Namespaces.ActiveGameAdmin);
        expect(socketServiceSpy.on).toHaveBeenCalledWith(Namespaces.ActiveGameAdmin, SocketEvent.JoinableGamesUpdated);
    });

    it('should fetch joinable games when JoinableGamesUpdated is emitted', () => {
        fixture.detectChanges();

        joinableGamesUpdated$.next();

        expect(activeGameTableServiceSpy.fetchJoinableActiveGames).toHaveBeenCalledTimes(2);
    });

    // Edge case: When the join page is destroyed, it should disconnect from the ActiveGameAdmin namespace.
    it('should disconnect the active-game namespace on destroy', () => {
        fixture.detectChanges();

        component.ngOnDestroy();

        expect(socketServiceSpy.disconnect).toHaveBeenCalledWith(Namespaces.ActiveGameAdmin);
    });
});

function createActiveGame(id: string): IActiveGame {
    return {
        _id: id,
        game: {} as IGame,
        players: [],
        currentPlayerIndex: 0,
        turnOrder: [],
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Organizer',
        maxPlayerCount: 4,
        turnIsInPreparation: false,

        turnStartTimeStamp: 0,
        currentAttack: null,
    };
}

type ActiveGameTableServiceSpy = SpyObj<Pick<ActiveGameTableService, 'fetchJoinableActiveGames'>> & Pick<ActiveGameTableService, 'tableData'>;
