/**
 * Testing strategy — Game grid panel
 *
 * - Validate header rendering and gameplay wiring to interaction service.
 * - Verify the combat popup shell integrates with the grid panel.
 */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { GameGridComponent } from '@app/components/common/game-grid/game-grid.component';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameInteractionService } from '@app/services/gameplay/game-interaction.service';
import { GamePopupStateService } from '@app/services/gameplay/game-popup-state.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { IActiveGame } from '@common/activeGame';
import { CombatOutcome } from '@common/attackResult';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { GameGridPanelComponent } from './game-grid-panel.component';

const TOOLTIP_VIEWPORT_WIDTH = 400;
const TOOLTIP_VIEWPORT_HEIGHT = 200;
const TOOLTIP_RENDER_WIDTH = 200;
const TOOLTIP_RENDER_HEIGHT = 90;
const TOOLTIP_INITIAL_POSITION_X = 132;
const TOOLTIP_INITIAL_POSITION_Y = 88;
const TOOLTIP_FIRST_CURSOR_X = 120;
const TOOLTIP_FIRST_CURSOR_Y = 80;
const TOOLTIP_SECOND_CURSOR_X = 350;
const TOOLTIP_SECOND_CURSOR_Y = 120;
const TOOLTIP_FLIPPED_POSITION_X = 138;
const TOOLTIP_FLIPPED_POSITION_Y = 22;

describe('GameGridPanelComponent', () => {
    let fixture: ComponentFixture<GameGridPanelComponent>;
    let component: GameGridPanelComponent;
    let interactionServiceSpy: jasmine.SpyObj<GameInteractionService>;
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let activeGameServiceStub: {
        activeGame: IActiveGame;
        currentPlayer: ReturnType<typeof signal<number>>;
        hasChangedLocation: ReturnType<typeof signal<boolean>>;
        hasAbandonned: ReturnType<typeof signal<boolean>>;
        gameHasEnded: ReturnType<typeof signal<boolean>>;
        reachableTiles: Set<number>;
        updateMovementRange: jasmine.Spy;
        getCurrentPlayer: jasmine.Spy<() => ICharacter | undefined>;
        getPlayersAtPosition: jasmine.Spy<(rowIndex: number, colIndex: number) => ICharacter[]>;
        getPlayerByName: jasmine.Spy<(name: string) => ICharacter | undefined>;
        roundOutcome: null;
        combatOutcome: ReturnType<typeof signal<CombatOutcome | null>>;
        isDebugMode: ReturnType<typeof signal<boolean>>;
    };
    let gameTurnServiceStub: {
        isCombatActive: ReturnType<typeof signal<boolean>>;
        combatTimeLeftSeconds: ReturnType<typeof signal<number | null>>;
    };
    let popupStateServiceStub: {
        isSanctuaryPopupVisible: boolean;
        closeSanctuaryPopup: jasmine.Spy;
        openTileInfo: jasmine.Spy;
        closeTileInfo: jasmine.Spy;
        tileInfoPopupData: {
            visible: boolean;
            title: string;
            description: string;
            movementCost: string;
            itemTitle: null;
            itemDescription: null;
            playerName: string | null;
            playerAvatarUrl: string | null;
        };
        sanctuaryPopupData: {
            visible: boolean;
            title: string;
            description: string;
            effectLabel: string;
        };
    };

    beforeEach(async () => {
        const alice = createCharacter('Alice', { x: 0, y: 0 });
        const bob = createCharacter('Bob', { x: 1, y: 0 });
        const activeGame = createActiveGame([alice, bob]);
        let tileInfoPopupData: {
            visible: boolean;
            title: string;
            description: string;
            movementCost: string;
            itemTitle: null;
            itemDescription: null;
            playerName: string | null;
            playerAvatarUrl: string | null;
        } = {
            visible: false,
            title: '',
            description: '',
            movementCost: '',
            itemTitle: null,
            itemDescription: null,
            playerName: null,
            playerAvatarUrl: null,
        };

        interactionServiceSpy = jasmine.createSpyObj<GameInteractionService>('GameInteractionService', [
            'handleKeyboard',
            'handleDocumentClick',
            'handleCellRightClick',
            'handleGridCellClick',
            'handlePlayerClick',
            'handleSanctuaryChoice',
        ]);
        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer']);
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(alice);

        activeGameServiceStub = {
            activeGame,
            currentPlayer: signal(0),
            hasChangedLocation: signal(false),
            hasAbandonned: signal(false),
            gameHasEnded: signal(false),
            reachableTiles: new Set<number>([0, 1]),
            updateMovementRange: jasmine.createSpy('updateMovementRange'),
            getCurrentPlayer: jasmine.createSpy('getCurrentPlayer').and.returnValue(alice),
            getPlayersAtPosition: jasmine.createSpy('getPlayersAtPosition').and.returnValue([]),
            getPlayerByName: jasmine
                .createSpy('getPlayerByName')
                .and.callFake((name: string) => activeGame.players.find((player) => player.name === name)),
            roundOutcome: null,
            combatOutcome: signal<CombatOutcome | null>(null),
            isDebugMode: signal(false),
        };
        gameTurnServiceStub = {
            isCombatActive: signal(false),
            combatTimeLeftSeconds: signal<number | null>(null),
        };

        popupStateServiceStub = {
            isSanctuaryPopupVisible: false,
            closeSanctuaryPopup: jasmine.createSpy('closeSanctuaryPopup'),
            openTileInfo: jasmine.createSpy('openTileInfo').and.callFake(() => {
                tileInfoPopupData = {
                    visible: true,
                    title: 'Tuile de base',
                    description: 'Terrain libre et traversable.',
                    movementCost: '1 point de mouvement.',
                    itemTitle: null,
                    itemDescription: null,
                    playerName: 'Alice',
                    playerAvatarUrl: '/avatar.png',
                };
            }),
            closeTileInfo: jasmine.createSpy('closeTileInfo').and.callFake(() => {
                tileInfoPopupData = {
                    visible: false,
                    title: '',
                    description: '',
                    movementCost: '',
                    itemTitle: null,
                    itemDescription: null,
                    playerName: null,
                    playerAvatarUrl: null,
                };
            }),
            get tileInfoPopupData() {
                return tileInfoPopupData;
            },
            sanctuaryPopupData: {
                visible: false,
                title: '',
                description: '',
                effectLabel: '',
            },
        };

        await TestBed.configureTestingModule({
            imports: [GameGridPanelComponent],
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: GameInteractionService, useValue: interactionServiceSpy },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
                { provide: GameTurnService, useValue: gameTurnServiceStub },
                { provide: BoardSharedService, useValue: { getObjectAt: () => null } },
                { provide: GamePopupStateService, useValue: popupStateServiceStub },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameGridPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('renders game title and board size', () => {
        const title = fixture.nativeElement.querySelector('[data-testid="game-grid-title"]') as HTMLElement;
        expect(title.textContent).toContain('Arena (2×2)');
    });

    it('refreshes player positions on gameplay updates', () => {
        const grid = fixture.debugElement.query(By.directive(GameGridComponent)).componentInstance as GameGridComponent;
        const initialPlayers = grid.players();

        activeGameServiceStub.activeGame.players[0].currentPosition = { x: 1, y: 1 };
        activeGameServiceStub.hasChangedLocation.set(!activeGameServiceStub.hasChangedLocation());
        fixture.detectChanges();

        const updatedPlayers = grid.players();

        expect(updatedPlayers).not.toBe(initialPlayers);
        expect(updatedPlayers?.[0].currentPosition).toEqual({ x: 1, y: 1 });
    });

    it('delegates grid and player events to interaction service', () => {
        const grid = fixture.debugElement.query(By.directive(GameGridComponent)).componentInstance as GameGridComponent;
        const mouseEvent = new MouseEvent('contextmenu');

        grid.cellContextMenu.emit({ rowIndex: 0, colIndex: 1, cellType: CellType.Empty, item: null, event: mouseEvent });
        grid.cellClick.emit({ rowIndex: 0, colIndex: 1, cellType: CellType.Empty, item: null, event: mouseEvent });
        grid.playerClicked.emit(activeGameServiceStub.activeGame.players[1]);

        expect(interactionServiceSpy.handleCellRightClick).toHaveBeenCalled();
        expect(interactionServiceSpy.handleGridCellClick).toHaveBeenCalledWith(0, 1, CellType.Empty, null);
        expect(interactionServiceSpy.handlePlayerClick).toHaveBeenCalledWith('Bob');
    });

    it('positions the tile tooltip near the cursor and keeps it updated while moving', () => {
        interactionServiceSpy.handleCellRightClick.and.callFake((event, rowIndex, colIndex, cellType) => {
            popupStateServiceStub.openTileInfo(cellType, null, null);
        });

        spyOnProperty(window, 'innerWidth', 'get').and.returnValue(TOOLTIP_VIEWPORT_WIDTH);
        spyOnProperty(window, 'innerHeight', 'get').and.returnValue(TOOLTIP_VIEWPORT_HEIGHT);

        const grid = fixture.debugElement.query(By.directive(GameGridComponent)).componentInstance as GameGridComponent;
        const firstEvent = new MouseEvent('contextmenu', { bubbles: true, clientX: TOOLTIP_FIRST_CURSOR_X, clientY: TOOLTIP_FIRST_CURSOR_Y });

        grid.cellContextMenu.emit({ rowIndex: 0, colIndex: 0, cellType: CellType.Empty, item: null, event: firstEvent });
        fixture.detectChanges();

        let tooltip = fixture.nativeElement.querySelector('app-game-tile-inspection-popup aside') as HTMLElement;

        expect(tooltip).toBeTruthy();
        expect((component as unknown as { tileInfoTooltipPosition: () => { x: number; y: number } }).tileInfoTooltipPosition()).toEqual({
            x: TOOLTIP_INITIAL_POSITION_X,
            y: TOOLTIP_INITIAL_POSITION_Y,
        });
        expect(tooltip.textContent).toContain('Alice');
        spyOn(tooltip, 'getBoundingClientRect').and.returnValue(createGridBounds(0, 0, TOOLTIP_RENDER_WIDTH, TOOLTIP_RENDER_HEIGHT));

        const secondCell = fixture.nativeElement.querySelectorAll('[data-testid="game-grid-cell"]')[1] as HTMLElement;
        secondCell.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: TOOLTIP_SECOND_CURSOR_X, clientY: TOOLTIP_SECOND_CURSOR_Y }));
        fixture.detectChanges();

        tooltip = fixture.nativeElement.querySelector('app-game-tile-inspection-popup aside') as HTMLElement;

        const updatedPosition = (component as unknown as { tileInfoTooltipPosition: () => { x: number; y: number } }).tileInfoTooltipPosition();
        expect(updatedPosition).toEqual({
            x: TOOLTIP_FLIPPED_POSITION_X,
            y: TOOLTIP_FLIPPED_POSITION_Y,
        });
        expect(popupStateServiceStub.openTileInfo).toHaveBeenCalledTimes(2);
    });

    it('dismisses the tile tooltip when the cursor leaves the grid', () => {
        popupStateServiceStub.openTileInfo(CellType.Empty, null, null);
        fixture.detectChanges();

        fixture.nativeElement.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: 20, clientY: 20 }));
        fixture.detectChanges();

        expect(popupStateServiceStub.closeTileInfo).toHaveBeenCalled();
        expect(fixture.nativeElement.querySelector('app-game-tile-inspection-popup aside')).toBeFalsy();
    });

    it('renders the combat popup shell alongside the grid', () => {
        expect(fixture.debugElement.query(By.css('app-game-combat-popup'))).toBeTruthy();
    });

    it('renders the combat outcome shell alongside the grid', () => {
        expect(fixture.debugElement.query(By.css('app-game-combat-outcome'))).toBeTruthy();
    });

    it('applies sizing and clipping to grid container', () => {
        const panelContainer = fixture.nativeElement.firstElementChild as HTMLElement;
        const gridContainer = fixture.nativeElement.querySelector('#grid-container');
        const gridSizer = gridContainer.firstElementChild as HTMLElement;

        expect(panelContainer.classList.contains('w-full')).toBeTruthy();
        expect(panelContainer.classList.contains('lg:h-full')).toBeTruthy();
        expect(gridContainer).toBeTruthy();
        expect(gridContainer.classList.contains('overflow-hidden')).toBeTruthy();
        expect(gridContainer.classList.contains('grow-0')).toBeTruthy();
        expect(gridContainer.classList.contains('lg:grow')).toBeTruthy();
        expect(gridSizer.classList.contains('aspect-square')).toBeTruthy();
        expect(gridSizer.classList.contains('lg:aspect-auto')).toBeTruthy();
    });

    it('delegates keyboard events to interaction service', () => {
        const keyboardEvent = new KeyboardEvent('keydown', { key: 'w' });

        (component as unknown as { handleKeyboard: (event: KeyboardEvent) => void }).handleKeyboard(keyboardEvent);

        expect(interactionServiceSpy.handleKeyboard).toHaveBeenCalledWith(keyboardEvent, 2);
    });
});

function createCharacter(name: string, currentPosition: { x: number; y: number }): ICharacter {
    return {
        name,
        avatar: Avatar.Avatar1,
        initialHealth: 4,
        currentHealth: 4,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.FourSided,
        rapidityPoints: 4,
        attackPoints: 4,
        defensePoints: 4,
        actionsLeft: 1,
        movementLeft: 2,
        victories: 0,
        hasAbandoned: false,
        startingPosition: currentPosition,
        currentPosition,
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}

function createActiveGame(players: ICharacter[]): IActiveGame {
    return {
        _id: 'active-game-id',
        game: {
            gameTitle: 'Arena',
            description: 'Desc',
            gameMode: GameType.Classic,
            visibility: Visibility.Viewable,
            board: {
                cells: [
                    [CellType.Empty, CellType.Empty],
                    [CellType.Empty, CellType.Empty],
                ],
                items: [],
            },
            dateCreated: new Date(),
            lastModifiedDate: new Date(),
        },
        players,
        currentPlayerIndex: 0,
        turnOrder: players.map((player) => player.name),
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Alice',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: null,
        turnStartTimeStamp: Date.now(),
        currentAttack: null,
    };
}

function createGridBounds(left: number, top: number, width: number, height: number): DOMRect {
    return {
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        x: left,
        y: top,
        toJSON: () => ({}),
    } as DOMRect;
}
