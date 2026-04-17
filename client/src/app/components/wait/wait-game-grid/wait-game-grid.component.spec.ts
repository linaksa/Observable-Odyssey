/**
 * Testing strategy — Wait Game Grid Component
 *
 * Approach:
 * - Seed an active-game board fixture and verify component getters expose map metadata and mode labels.
 * - Confirm object lookup behavior is delegated to `BoardSharedService` with the live item collection.
 * - Validate lobby-capacity visuals by mutating player counts and checking computed lock-icon output.
 *
 * Edge cases covered:
 * - Classic and CTF modes map to distinct user-facing labels (`Normal` vs `CTF`).
 * - Lookup delegation keeps using the updated item array after runtime mutations.
 * - Full lobbies switch from unlocked to locked icons once `maxPlayerCount` is reached.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { GameType } from '@common/game';
import { IItem, ItemType, SMALL_ITEM_SIZE } from '@common/items';
import { WaitGameGridComponent } from '@app/components/wait/wait-game-grid/wait-game-grid.component';

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
        // Nominal case: getters mirror active game board metadata and mode label.
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
        // Edge case: full lobbies switch from unlocked to locked icon.
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
