/**
 * Testing strategy — GameTableComponent
 *
 * Summary:
 * - Validate the input contract (`games` XOR `activeGames`) and invalid combinations.
 * - Assert row-model behavior: `gameList` returns table rows (IExistingGame | IActiveGame)
 *   and `getGame` resolves display data from each row.
 * - Assert active-game helpers (`numOfPlayer`, `maximumNumOfPlayer`) read values from
 *   active rows directly.
 * - Protect the regression where two active rows share the same embedded game object:
 *   action templates must still receive two distinct active-game ids.
 * - Validate custom description tooltip behavior: immediate hover display, cursor-follow
 *   position updates, parent-bounded clamping, and proper hide on leave.
 *
 * Approach:
 * - Use a standalone host component that binds inputs and provides a real action TemplateRef.
 * - Keep assertions focused on the public API and rendered action context attributes.
 * - Use deterministic factory helpers to keep test data concise and stable.
 *
 * Edge cases covered:
 * 1) No list provided -> throws.
 * 2) Both lists provided -> throws.
 * 3) `games` mode -> rows are IExistingGame and active helpers return 0.
 * 4) `activeGames` mode -> rows are IActiveGame and helpers return active player values.
 * 5) Regression -> duplicate embedded game reference still yields distinct action ids.
 * 6) Tooltip shows instantly on hover and tracks pointer coordinates.
 * 7) Tooltip hides when hover ends.
 * 8) Tooltip coordinates are clamped so the box remains visible inside the table container.
 */
import { Component, ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IExistingGame, IGame, Visibility } from '@common/game';
import { GameTableComponent } from './game-table.component';

type GameTableRow = IExistingGame | IActiveGame;
const TWO_PLAYERS = 2;
const THREE_PLAYERS = 3;
const MAX_PLAYER_COUNT_FOUR = 4;
const MAX_PLAYER_COUNT_SIX = 6;
const DEFAULT_MAX_PLAYER_COUNT = MAX_PLAYER_COUNT_FOUR;
const TOOLTIP_Y_OFFSET = 8;
const TOOLTIP_X_OFFSET = 12;
const TOOLTIP_START_X = 120;
const TOOLTIP_START_Y = 80;
const TOOLTIP_NEXT_X = 185;
const TOOLTIP_NEXT_Y = 110;
const CONTAINER_LEFT = 20;
const CONTAINER_TOP = 40;
const CONTAINER_WIDTH = 300;
const CONTAINER_HEIGHT = 180;
const TOOLTIP_WIDTH = 200;
const TOOLTIP_HEIGHT = 90;
const LARGE_CONTAINER_DIMENSION = 1_000;
const SMALL_TOOLTIP_WIDTH = 100;
const SMALL_TOOLTIP_HEIGHT = 50;
const CLAMPED_TOP = 90;
const CURSOR_LEFT_EDGE_OFFSET = 8;
const CURSOR_BOTTOM_EDGE_OFFSET = 160;
const ZERO_DIMENSION = 0;

@Component({
    standalone: true,
    imports: [GameTableComponent],
    template: `
        <ng-template #actions let-gameRow>
            <button class="action-button" type="button" [attr.data-row-id]="gameRow._id">{{ getTitle(gameRow) }}</button>
        </ng-template>

        <app-game-table [games]="games" [activeGames]="activeGames" [isLoading]="isLoading" [actions]="actions"></app-game-table>
    `,
})
class HostComponent {
    games?: IExistingGame[];
    activeGames?: IActiveGame[];
    isLoading = false;

    getTitle(gameRow: GameTableRow): string {
        return 'game' in gameRow ? gameRow.game.gameTitle : gameRow.gameTitle;
    }
}

describe('GameTableComponent', () => {
    let fixture: ComponentFixture<HostComponent>;
    let hostComponent: HostComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HostComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(HostComponent);
        hostComponent = fixture.componentInstance;
    });

    // Edge case: should throw when no list is provided.
    it('should throw when no list is provided', () => {
        expect(() => fixture.detectChanges()).toThrowError('No lists has been passed to fill the table.');
    });

    // Edge case: should throw when both lists are provided.
    it('should throw when both lists are provided', () => {
        const game = createExistingGame('game-1', 'Game 1');
        hostComponent.games = [game];
        hostComponent.activeGames = [createActiveGame('active-game-1', game)];

        expect(() => fixture.detectChanges()).toThrowError('Too many lists has been passed to fill the table.');
    });

    it('should expose regular game rows when games input is set', () => {
        const game = createExistingGame('game-1', 'Game 1');
        hostComponent.games = [game];

        fixture.detectChanges();

        const tableComponent = getGameTableComponent(fixture);
        expect(tableComponent.gameList).toEqual([game]);
        expect(tableComponent.getGame(game)).toBe(game);
        expect(tableComponent.isActiveGame()).toBeFalse();
        expect(tableComponent.numOfPlayer(game)).toBe(0);
        expect(tableComponent.maximumNumOfPlayer(game)).toBe(0);
    });

    it('should expose active game rows and player counts when activeGames input is set', () => {
        const game = createExistingGame('game-1', 'Game 1');
        const activeGame = createActiveGame('active-game-1', game, TWO_PLAYERS, MAX_PLAYER_COUNT_SIX);
        hostComponent.activeGames = [activeGame];

        fixture.detectChanges();

        const tableComponent = getGameTableComponent(fixture);
        expect(tableComponent.gameList).toEqual([activeGame]);
        expect(tableComponent.getGame(activeGame)).toBe(game);
        expect(tableComponent.isActiveGame()).toBeTrue();
        expect(tableComponent.numOfPlayer(activeGame)).toBe(TWO_PLAYERS);
        expect(tableComponent.maximumNumOfPlayer(activeGame)).toBe(MAX_PLAYER_COUNT_SIX);
    });

    // Edge case: should return empty gameList when inputs become undefined after initialization.
    it('should return empty gameList when inputs become undefined after initialization', () => {
        const game = createExistingGame('game-1', 'Game 1');
        hostComponent.games = [game];
        fixture.detectChanges();

        const tableComponent = getGameTableComponent(fixture);
        const tableInputs = tableComponent as unknown as {
            activeGames: () => IActiveGame[] | undefined;
            games: () => IExistingGame[] | undefined;
        };
        tableInputs.activeGames = () => undefined;
        tableInputs.games = () => undefined;

        expect(tableComponent.gameList).toEqual([]);
    });

    it('should pass distinct active-game rows to actions when embedded game object is shared', () => {
        const sharedGame = createExistingGame('game-1', 'Shared Game');
        hostComponent.activeGames = [
            createActiveGame('active-game-1', sharedGame, 1, MAX_PLAYER_COUNT_FOUR),
            createActiveGame('active-game-2', sharedGame, THREE_PLAYERS, MAX_PLAYER_COUNT_FOUR),
        ];

        fixture.detectChanges();

        const actionButtons = fixture.debugElement.queryAll(By.css('.action-button'));
        const activeGameIds = actionButtons.map((button) => button.nativeElement.getAttribute('data-row-id'));

        expect(activeGameIds).toEqual(['active-game-1', 'active-game-2']);
        expect(new Set(activeGameIds).size).toBe(2);
    });

    it('should show tooltip on hover and update tooltip position on cursor move', () => {
        const game = createExistingGame('game-1', 'Game 1');
        hostComponent.games = [game];
        fixture.detectChanges();

        const tooltipApi = getTooltipApi(getGameTableComponent(fixture));
        tooltipApi.tableContainerRef = createContainerElementRef(0, 0, LARGE_CONTAINER_DIMENSION, LARGE_CONTAINER_DIMENSION);
        tooltipApi.descriptionTooltipRef = createTooltipElementRef(SMALL_TOOLTIP_WIDTH, SMALL_TOOLTIP_HEIGHT);
        tooltipApi.showDescriptionTooltip(createMouseEvent('mouseenter', TOOLTIP_START_X, TOOLTIP_START_Y), game.description);

        expect(tooltipApi.descriptionTooltip()).toBe(game.description);
        expect(tooltipApi.descriptionTooltipPosition()).toEqual({
            x: TOOLTIP_START_X + TOOLTIP_X_OFFSET,
            y: TOOLTIP_START_Y + TOOLTIP_Y_OFFSET,
        });

        tooltipApi.updateDescriptionTooltipPosition(createMouseEvent('mousemove', TOOLTIP_NEXT_X, TOOLTIP_NEXT_Y));

        expect(tooltipApi.descriptionTooltipPosition()).toEqual({
            x: TOOLTIP_NEXT_X + TOOLTIP_X_OFFSET,
            y: TOOLTIP_NEXT_Y + TOOLTIP_Y_OFFSET,
        });
    });

    it('should hide tooltip on mouse leave', () => {
        const game = createExistingGame('game-1', 'Game 1');
        hostComponent.games = [game];
        fixture.detectChanges();

        const tooltipApi = getTooltipApi(getGameTableComponent(fixture));
        tooltipApi.showDescriptionTooltip(createMouseEvent('mouseenter', TOOLTIP_START_X, TOOLTIP_START_Y), game.description);
        tooltipApi.hideDescriptionTooltip();

        expect(tooltipApi.descriptionTooltip()).toBeNull();
    });

    // Edge case: should use cursor fallback position when container bounds are unavailable.
    it('should use cursor fallback position when container bounds are unavailable', () => {
        const game = createExistingGame('game-1', 'Game 1');
        hostComponent.games = [game];
        fixture.detectChanges();

        const tooltipApi = getTooltipApi(getGameTableComponent(fixture));
        tooltipApi.tableContainerRef = createContainerElementRef(ZERO_DIMENSION, ZERO_DIMENSION, ZERO_DIMENSION, ZERO_DIMENSION);
        tooltipApi.showDescriptionTooltip(createMouseEvent('mouseenter', TOOLTIP_START_X, TOOLTIP_START_Y), game.description);

        expect(tooltipApi.descriptionTooltipPosition()).toEqual({
            x: TOOLTIP_START_X,
            y: TOOLTIP_START_Y + TOOLTIP_Y_OFFSET,
        });
    });

    it('should keep tooltip inside container bounds', () => {
        const game = createExistingGame('game-1', 'Game 1');
        hostComponent.games = [game];
        fixture.detectChanges();

        const tooltipApi = getTooltipApi(getGameTableComponent(fixture));
        tooltipApi.tableContainerRef = createContainerElementRef(CONTAINER_LEFT, CONTAINER_TOP, CONTAINER_WIDTH, CONTAINER_HEIGHT);
        tooltipApi.descriptionTooltipRef = createTooltipElementRef(TOOLTIP_WIDTH, TOOLTIP_HEIGHT);

        tooltipApi.showDescriptionTooltip(
            createMouseEvent('mouseenter', CONTAINER_LEFT + CURSOR_LEFT_EDGE_OFFSET, CONTAINER_TOP + CURSOR_BOTTOM_EDGE_OFFSET),
            game.description,
        );

        expect(tooltipApi.descriptionTooltipPosition()).toEqual({
            x: 20,
            y: CLAMPED_TOP,
        });
    });
});

function getGameTableComponent(fixture: ComponentFixture<HostComponent>): GameTableComponent {
    return fixture.debugElement.query(By.directive(GameTableComponent)).componentInstance as GameTableComponent;
}

function getTooltipApi(component: GameTableComponent): TooltipApi {
    return component as unknown as TooltipApi;
}

function createMouseEvent(type: string, x: number, y: number): MouseEvent {
    return new MouseEvent(type, { clientX: x, clientY: y });
}

function createContainerElementRef(left: number, top: number, width: number, height: number): ElementRef<HTMLDivElement> {
    const element = {
        getBoundingClientRect: () => ({ left, top, width, height }) as DOMRect,
    } as HTMLDivElement;
    return new ElementRef(element);
}

function createTooltipElementRef(offsetWidth: number, offsetHeight: number): ElementRef<HTMLDivElement> {
    const element = { offsetWidth, offsetHeight } as HTMLDivElement;
    return new ElementRef(element);
}

function createExistingGame(id: string, title: string): IExistingGame {
    return {
        _id: id,
        gameTitle: title,
        description: `Description for ${title}`,
        gameMode: GameType.Classic,
        lastModifiedDate: new Date('2024-01-01'),
        dateCreated: new Date('2024-01-01'),
        visibility: Visibility.Viewable,
        preview: '' as Base64URLString,
        board: { cells: [[CellType.Empty]], items: [] },
    };
}

function createActiveGame(id: string, game: IGame, players = 0, maxPlayerCount = DEFAULT_MAX_PLAYER_COUNT): IActiveGame {
    return {
        _id: id,
        game,
        players: Array.from({ length: players }, (_, index) => createCharacter(index)),
        itemsState: [],
        currentPlayerIndex: 0,
        turnOrder: [],
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Organizer',
        maxPlayerCount,
        turnIsInPreparation: false,
    };
}

function createCharacter(index: number): ICharacter {
    return {
        name: `Player ${index + 1}`,
        avatar: Avatar.Avatar1,
        initialHealth: 4,
        currentHealth: 4,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints: 4,
        attackPoints: 4,
        defensePoints: 4,
        actionsLeft: 1,
        movementLeft: 1,
        victories: 0,
        hasAbandoned: false,
        positionDepart: { x: 0, y: 0 },
        positionGrille: { x: 0, y: 0 },
    };
}

type TooltipApi = {
    descriptionTooltip: () => string | null;
    descriptionTooltipPosition: () => { x: number; y: number };
    showDescriptionTooltip: (event: MouseEvent, description: string) => void;
    updateDescriptionTooltipPosition: (event: MouseEvent) => void;
    hideDescriptionTooltip: () => void;
    tableContainerRef?: ElementRef<HTMLDivElement>;
    descriptionTooltipRef?: ElementRef<HTMLDivElement>;
};
