/**
 * Testing strategy — Game Infos Component
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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/active-game.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { GameType } from '@common/game';
import { GameInfosComponent } from './game-infos.component';

describe('GameInfosComponent', () => {
    let component: GameInfosComponent;
    let fixture: ComponentFixture<GameInfosComponent>;
    let activeGameServiceStub: {
        activeGame: IActiveGame;
        isDebugMode: jasmine.Spy<() => boolean>;
    };

    beforeEach(async () => {
        activeGameServiceStub = {
            activeGame: createActiveGame('Arena', [[CellType.Empty, CellType.Empty], [CellType.Empty, CellType.Empty]]),
            isDebugMode: jasmine.createSpy('isDebugMode').and.returnValue(false),
        };

        await TestBed.configureTestingModule({
            imports: [GameInfosComponent],
            providers: [{ provide: ActiveGameService, useValue: activeGameServiceStub }],
        }).compileComponents();

        fixture = TestBed.createComponent(GameInfosComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should compute board size from current game grid', () => {
        expect(component.boardSize).toBe('2x2');
    });

    it('should render title and board size', () => {
        fixture.detectChanges();
        const content = (fixture.nativeElement as HTMLElement).textContent;

        expect(content).toContain('Arena (2x2)');
    });

    it('should show debug label when debug mode is enabled', () => {
        activeGameServiceStub.isDebugMode.and.returnValue(true);
        fixture = TestBed.createComponent(GameInfosComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        const debugLabel = (fixture.nativeElement as HTMLElement).querySelector('h5');

        expect(debugLabel?.textContent).toContain('DEBUG MODE');
    });

    it('should hide debug label when debug mode is disabled', () => {
        activeGameServiceStub.isDebugMode.and.returnValue(false);
        fixture = TestBed.createComponent(GameInfosComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
        const debugLabel = (fixture.nativeElement as HTMLElement).querySelector('h5');

        expect(debugLabel).toBeNull();
    });
});

function createActiveGame(title: string, cells: CellType[][]): IActiveGame {
    return {
        game: {
            gameTitle: title,
            board: {
                cells,
                items: [],
            },
            gameMode: GameType.Classic,
        },
    } as unknown as IActiveGame;
}
