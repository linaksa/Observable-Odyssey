import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { GameType, Visibility } from '@common/game';

import { GlobalStatsComponent } from './global-stats.component';

describe('GlobalStatsComponent', () => {
    let component: GlobalStatsComponent;
    let fixture: ComponentFixture<GlobalStatsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GlobalStatsComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GlobalStatsComponent);
        component = fixture.componentInstance;

        component.activeGame = {
            _id: 'active-game-id',
            game: {
                gameTitle: 'test-game',
                description: 'test-description',
                gameMode: GameType.Classic,
                lastModifiedDate: new Date(),
                dateCreated: new Date(),
                visibility: Visibility.Viewable,
                board: {
                    cells: [[CellType.Empty]],
                    items: [],
                },
            },
            createdAt: new Date('2026-01-01T00:00:00Z'),
            endedAt: new Date('2026-01-01T00:01:00Z'),
            players: [],
            currentPlayerIndex: 0,
            turnOrder: [],
            isFinished: true,
            winner: null,
            messages: [],
            isDebugMode: false,
            organizerName: 'organizer',
            maxPlayerCount: 2,
            turnIsInPreparation: false,
            hasFlagId: null,
            turnStartTimeStamp: 0,
            totalTurnCount: 0,
            usedSanctuaries: [],
            manipulatedDoors: [],
            flagHolderHistory: [],
            currentAttack: null,
        } as IActiveGame;

        fixture.detectChanges();
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
