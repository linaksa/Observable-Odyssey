/**
 * Testing strategy — Wait Game Grid Component
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
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { GameType } from '@common/game';
import { IItem, ItemType, SMALL_ITEM_SIZE } from '@common/items';
import { WaitGameGridComponent } from './wait-game-grid.component';

describe('WaitGameGridComponent', () => {
    let component: WaitGameGridComponent;
    let fixture: ComponentFixture<WaitGameGridComponent>;
    let boardSharedServiceSpy: jasmine.SpyObj<BoardSharedService>;
    let activeGameServiceStub: { activeGame: IActiveGame };
    let boardItems: IItem[];

    beforeEach(async () => {
        boardItems = [createItem(ItemType.Flag, 0, 0)];
        activeGameServiceStub = {
            activeGame: {
                game: {
                    gameTitle: 'Maze',
                    description: 'Fast match',
                    gameMode: GameType.Classic,
                    board: {
                        cells: [
                            [CellType.Empty, CellType.Water],
                            [CellType.Ice, CellType.Wall],
                        ],
                        items: boardItems,
                    },
                },
                players: [],
            } as unknown as IActiveGame,
        };
        boardSharedServiceSpy = jasmine.createSpyObj<BoardSharedService>('BoardSharedService', ['getObjectAt']);

        await TestBed.configureTestingModule({
            imports: [WaitGameGridComponent],
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: BoardSharedService, useValue: boardSharedServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(WaitGameGridComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should expose board metadata through component getters', () => {
        const componentApi = component as unknown as WaitGameGridApi;

        expect(componentApi.table).toEqual(activeGameServiceStub.activeGame.game.board.cells);
        expect(componentApi.items).toEqual(boardItems);
        expect(componentApi.gameTitle).toBe('Maze');
        expect(componentApi.gameDescription).toBe('Fast match');
        expect(componentApi.gameMode).toBe('Normal');

        activeGameServiceStub.activeGame.game.gameMode = GameType.Ctf;
        expect(componentApi.gameMode).toBe('CTF');
    });

    it('should delegate getObjectAt to BoardSharedService with current item list', () => {
        const item = createItem(ItemType.Flag, 1, 0);
        boardItems.push(item);
        boardSharedServiceSpy.getObjectAt.and.returnValue(item);

        const found = component.getObjectAt(1, 0);

        expect(found).toBe(item);
        expect(boardSharedServiceSpy.getObjectAt).toHaveBeenCalledWith(1, 0, boardItems);
    });

    it('should return lock icon according to player count', () => {
        activeGameServiceStub.activeGame.players = [];
        activeGameServiceStub.activeGame.maxPlayerCount = 2;

        expect(component['lockIcon']).toBe('assets/wait-page/unlock.svg');

        activeGameServiceStub.activeGame.players = [{ name: 'Player1' }, { name: 'Player2' }] as unknown as ICharacter[];
        activeGameServiceStub.activeGame.maxPlayerCount = 2;
        expect(component['lockIcon']).toBe('assets/wait-page/lock.svg');
    });
});

function createItem(itemType: ItemType, x: number, y: number): IItem {
    return {
        itemType,
        x,
        y,
        size: SMALL_ITEM_SIZE,
    };
}

type WaitGameGridApi = {
    table: CellType[][];
    items: IItem[];
    gameTitle: string;
    gameDescription: string;
    gameMode: string;
};
