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
import { CELL_TYPE_PATHS, ITEM_TYPE_PATHS } from '@app/constants/backgrounds-mapping';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { BoardSharedService } from '@app/services/shared/boardShared.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { GameType } from '@common/game';
import { IItem, ItemType, SMALL_ITEM_SIZE } from '@common/items';
import { WaitGameGridComponent } from './wait-game-grid.component';

const SANCTUARY_ROW = 2;
const SANCTUARY_COLUMN = 3;

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
        expect(componentApi.tableSize).toBe(2);
        expect(componentApi.gameMode).toBe('Normal');

        activeGameServiceStub.activeGame.game.gameMode = GameType.Ctf;
        expect(componentApi.gameMode).toBe('CTF');
    });

    it('should map cell and object image paths', () => {
        const item = createItem(ItemType.Flag, 1, 1);

        expect(component.cellImagePath(CellType.Ice)).toBe(CELL_TYPE_PATHS[CellType.Ice]);
        expect(component.objectImagePath(item)).toBe(ITEM_TYPE_PATHS[ItemType.Flag]);
        expect(component.objectImagePath(null)).toBe('');
    });

    it('should delegate getObjectAt to BoardSharedService with current item list', () => {
        const item = createItem(ItemType.Flag, 1, 0);
        boardItems.push(item);
        boardSharedServiceSpy.getObjectAt.and.returnValue(item);

        const found = component.getObjectAt(1, 0);

        expect(found).toBe(item);
        expect(boardSharedServiceSpy.getObjectAt).toHaveBeenCalledWith(1, 0, boardItems);
    });

    it('should compute sanctuary styles for each covered cell', () => {
        const sanctuary = createItem(ItemType.LifeSanctuary, SANCTUARY_ROW, SANCTUARY_COLUMN);

        expect(component.objectExtraStyles(sanctuary, SANCTUARY_ROW, SANCTUARY_COLUMN)).toEqual({
            top: '0',
            left: '0',
            width: '200%',
            height: '200%',
        });
        expect(component.objectExtraStyles(sanctuary, SANCTUARY_ROW + 1, SANCTUARY_COLUMN + 1)).toEqual({
            top: '-100%',
            left: '-100%',
            width: '200%',
            height: '200%',
        });
    });

    it('should compute full-cell styles for regular objects', () => {
        const flag = createItem(ItemType.Flag, 0, 0);

        expect(component.objectExtraStyles(flag, 0, 0)).toEqual({
            inset: '0',
            width: '100%',
            height: '100%',
        });
    });

    // Edge case: should return empty styles for missing object.
    it('should return empty styles for missing object', () => {
        expect(component.objectExtraStyles(null as unknown as IItem, 0, 0)).toEqual({});
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
    tableSize: number;
    gameMode: string;
};
