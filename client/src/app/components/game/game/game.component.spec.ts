/* eslint-disable max-lines */
/**
 * Testing strategy — Game Component
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
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GamePopupStateService } from '@app/services/gameplay/game-popup-state.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType, PRIX_PORTE_GAZON } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { IItem, ItemType } from '@common/items';
import { GameComponent } from './game.component';

const BOARD_SIDE_SIZE = 2;
const BOARD_NODE_COUNT = 4;
const MOVEMENT_COLUMNS = 3;
const PLAYER_COUNT_LIMIT = 4;
const SANCTUARY_GRAPH_INDEX = 4;
const SANCTUARY_INTERACTION_ROW = 3;
const SANCTUARY_INTERACTION_COL = 2;

describe('GameComponent', () => {
    let component: GameComponent;
    let fixture: ComponentFixture<GameComponent>;
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let boardSharedServiceSpy: jasmine.SpyObj<BoardSharedService>;
    let popupStateService: GamePopupStateService;

    let activeGameServiceStub: {
        activeGame: IActiveGame;
        currentPlayer: ReturnType<typeof signal<number>>;
        hasChangedLocation: ReturnType<typeof signal<boolean>>;
        hasAbandonned: ReturnType<typeof signal<boolean>>;
        gameHasEnded: ReturnType<typeof signal<boolean>>;
        updateMovementRange: jasmine.Spy;
        getCurrentPlayer: jasmine.Spy<() => ICharacter | undefined>;
        tryMove: jasmine.Spy;
        actionMode: ReturnType<typeof signal<boolean>>;
        actionOnPlayer: jasmine.Spy;
        isDebugMode: jasmine.Spy<() => boolean>;
        debugTeleport: jasmine.Spy;
        toggleDoor: jasmine.Spy;
        interactSanctuary: jasmine.Spy;
        getPlayersAtPosition: jasmine.Spy<(row: number, col: number) => ICharacter[]>;
        reachableTiles: Set<number>;
        getIndex: jasmine.Spy<(row: number, col: number, columns: number) => number>;
    };

    beforeEach(async () => {
        const alice = createCharacter('Alice');
        const bob = createCharacter('Bob');

        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer']);
        boardSharedServiceSpy = jasmine.createSpyObj<BoardSharedService>('BoardSharedService', ['getObjectAt']);

        activeGameServiceStub = {
            activeGame: createActiveGame([alice, bob]),
            currentPlayer: signal(0),
            hasChangedLocation: signal(false),
            hasAbandonned: signal(false),
            gameHasEnded: signal(false),
            updateMovementRange: jasmine.createSpy('updateMovementRange'),
            getCurrentPlayer: jasmine.createSpy('getCurrentPlayer').and.returnValue(alice),
            tryMove: jasmine.createSpy('tryMove'),
            actionMode: signal(false),
            actionOnPlayer: jasmine.createSpy('actionOnPlayer'),
            isDebugMode: jasmine.createSpy('isDebugMode').and.returnValue(false),
            debugTeleport: jasmine.createSpy('debugTeleport'),
            toggleDoor: jasmine.createSpy('toggleDoor'),
            interactSanctuary: jasmine.createSpy('interactSanctuary'),
            getPlayersAtPosition: jasmine.createSpy('getPlayersAtPosition').and.returnValue([]),
            reachableTiles: new Set<number>(),
            getIndex: jasmine.createSpy('getIndex').and.callFake((row: number, col: number, columns: number) => row * columns + col),
        };

        localPlayerServiceSpy.getLocalPlayer.and.returnValue(alice);
        boardSharedServiceSpy.getObjectAt.and.returnValue(null);

        TestBed.overrideComponent(GameComponent, {
            set: {
                template: '',
                imports: [],
            },
        });

        await TestBed.configureTestingModule({
            imports: [GameComponent],
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
                { provide: BoardSharedService, useValue: boardSharedServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameComponent);
        component = fixture.componentInstance;
        popupStateService = TestBed.inject(GamePopupStateService);
    });

    it('should compute grid dimensions and movement graph on init', () => {
        activeGameServiceStub.updateMovementRange.calls.reset();

        component.ngOnInit();

        expect(component.totalRows).toBe(BOARD_SIDE_SIZE);
        expect(component.totalColumns).toBe(BOARD_SIDE_SIZE);
        expect(component.graph.length).toBe(BOARD_NODE_COUNT);
        expect(activeGameServiceStub.updateMovementRange).toHaveBeenCalledWith(BOARD_SIDE_SIZE, component.graph);
    });

    it('should rebuild the movement graph when the board changes', () => {
        component.ngOnInit();

        expect(component.graph[0].some(([index]) => index === 1)).toBeTrue();

        activeGameServiceStub.activeGame.players[0].actionsLeft = 0;
        activeGameServiceStub.activeGame.game.board.cells[0][1] = CellType.ClosedDoor;
        activeGameServiceStub.hasChangedLocation.set(true);
        fixture.detectChanges();

        expect(component.graph[0].some(([index]) => index === 1)).toBeFalse();

        activeGameServiceStub.activeGame.game.board.cells[0][1] = CellType.OpenDoor;
        activeGameServiceStub.hasChangedLocation.set(false);
        fixture.detectChanges();

        expect(component.graph[0].some(([index, weight]) => index === 1 && weight === PRIX_PORTE_GAZON)).toBeTrue();
    });

    it('should block sanctuary tiles in the movement graph', () => {
        activeGameServiceStub.activeGame.game.board.cells = [
            [CellType.Empty, CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.Empty, CellType.Empty],
        ];
        activeGameServiceStub.activeGame.game.board.items = [createSanctuaryItem(1, 1)];

        component.ngOnInit();

        expect(component.graph[1].some(([index]) => index === SANCTUARY_GRAPH_INDEX)).toBeFalse();
        expect(component.graph[3].some(([index]) => index === SANCTUARY_GRAPH_INDEX)).toBeFalse();
        expect(component.graph[5].some(([index]) => index === SANCTUARY_GRAPH_INDEX)).toBeFalse();
        expect(component.graph[7].some(([index]) => index === SANCTUARY_GRAPH_INDEX)).toBeFalse();
    });

    it('should block player-occupied tiles in the movement graph', () => {
        activeGameServiceStub.activeGame.game.board.cells = [
            [CellType.Empty, CellType.Empty],
            [CellType.Empty, CellType.Empty],
        ];
        activeGameServiceStub.activeGame.players[1].positionGrille = { x: 1, y: 0 };

        component.ngOnInit();

        expect(component.graph[0].some(([index]) => index === 1)).toBeFalse();
        expect(component.graph[2].some(([index]) => index === 1)).toBeFalse();
    });

    it('should ignore keyboard movement while typing in chat', () => {
        component.totalColumns = 2;

        component.handleKeyboard(createKeyboardEvent('w', true));

        expect(activeGameServiceStub.tryMove).not.toHaveBeenCalled();
    });

    // Edge case: When no local player is available, ignore keyboard movement.
    it('should ignore keyboard movement when no local player is available', () => {
        component.totalColumns = MOVEMENT_COLUMNS;
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);

        component.handleKeyboard(createKeyboardEvent('w'));

        expect(activeGameServiceStub.tryMove).not.toHaveBeenCalled();
    });

    // Edge case: When local player is not current player, ignore keyboard movement.
    it('should ignore keyboard movement when local player is not current player', () => {
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Bob'));
        activeGameServiceStub.getCurrentPlayer.and.returnValue(createCharacter('Alice'));

        component.handleKeyboard(createKeyboardEvent('w'));

        expect(activeGameServiceStub.tryMove).not.toHaveBeenCalled();
    });

    it('should move with WASD keys when it is local player turn', () => {
        component.totalColumns = MOVEMENT_COLUMNS;

        component.handleKeyboard(createKeyboardEvent('w'));
        component.handleKeyboard(createKeyboardEvent('s'));
        component.handleKeyboard(createKeyboardEvent('a'));
        component.handleKeyboard(createKeyboardEvent('d'));

        expect(activeGameServiceStub.tryMove.calls.allArgs()).toEqual([
            [-1, 0, MOVEMENT_COLUMNS],
            [1, 0, MOVEMENT_COLUMNS],
            [0, -1, MOVEMENT_COLUMNS],
            [0, 1, MOVEMENT_COLUMNS],
        ]);
    });

    it('should ignore unsupported keyboard keys', () => {
        component.totalColumns = MOVEMENT_COLUMNS;

        component.handleKeyboard(createKeyboardEvent('x'));

        expect(activeGameServiceStub.tryMove).not.toHaveBeenCalled();
    });

    it('should attack clicked player only in action mode during local turn', () => {
        activeGameServiceStub.actionMode.set(false);
        component.onPlayerClicked('Bob');
        expect(activeGameServiceStub.actionOnPlayer).not.toHaveBeenCalled();

        activeGameServiceStub.actionMode.set(true);
        component.onPlayerClicked('Bob');

        expect(activeGameServiceStub.actionOnPlayer).toHaveBeenCalledWith('Bob');
        expect(activeGameServiceStub.actionMode()).toBeFalse();
    });

    it('should toggle a door on right click during the local turn', () => {
        popupStateService.isTileInfoVisible = true;
        activeGameServiceStub.isDebugMode.and.returnValue(false);
        boardSharedServiceSpy.getObjectAt.and.returnValue(null);
        activeGameServiceStub.getPlayersAtPosition.and.returnValue([]);

        component.onCellRightClick(createContextMenuEvent(), 1, 1, CellType.ClosedDoor);

        expect(activeGameServiceStub.toggleDoor).toHaveBeenCalledWith(1, 1);
        expect(popupStateService.isTileInfoVisible).toBeFalse();
        expect(activeGameServiceStub.debugTeleport).not.toHaveBeenCalled();
    });

    it('should toggle a door from attack mode when the door cell is clicked', () => {
        activeGameServiceStub.actionMode.set(true);
        activeGameServiceStub.isDebugMode.and.returnValue(false);
        boardSharedServiceSpy.getObjectAt.and.returnValue(null);
        activeGameServiceStub.getPlayersAtPosition.and.returnValue([]);

        component.onGridCellClick(createGridCellEvent(1, 1, CellType.ClosedDoor));

        expect(activeGameServiceStub.toggleDoor).toHaveBeenCalledWith(1, 1);
        expect(activeGameServiceStub.actionMode()).toBeFalse();
    });

    it('should not toggle a door from attack mode when a player or flag occupies the cell', () => {
        activeGameServiceStub.actionMode.set(true);
        activeGameServiceStub.isDebugMode.and.returnValue(false);
        activeGameServiceStub.getPlayersAtPosition.and.returnValue([createCharacter('Bob')]);

        component.onGridCellClick(createGridCellEvent(1, 1, CellType.OpenDoor));

        expect(activeGameServiceStub.toggleDoor).not.toHaveBeenCalled();
        expect(activeGameServiceStub.actionMode()).toBeTrue();
    });

    it('should open a sanctuary popup from attack mode when the player is adjacent', () => {
        const sanctuary = createSanctuaryItem(1, 1);
        const currentPlayer = createCharacter('Alice');
        currentPlayer.positionGrille = { x: 0, y: 1 };
        activeGameServiceStub.actionMode.set(true);
        activeGameServiceStub.getCurrentPlayer.and.returnValue(currentPlayer);
        activeGameServiceStub.getPlayersAtPosition.and.returnValue([]);

        component.onGridCellClick(createGridCellEvent(1, 1, CellType.Empty, sanctuary));

        expect(popupStateService.isSanctuaryPopupVisible).toBeTrue();
        expect(popupStateService.sanctuaryPopupTitle).toContain('Sanctuaire');
        expect(popupStateService.sanctuaryPopupEffectLabel).toContain('2x');
        expect(activeGameServiceStub.toggleDoor).not.toHaveBeenCalled();
        expect(activeGameServiceStub.interactSanctuary).not.toHaveBeenCalled();
    });

    it('should keep the sanctuary popup open after a grid click', () => {
        const sanctuary = createSanctuaryItem(1, 1);
        const currentPlayer = createCharacter('Alice');
        currentPlayer.positionGrille = { x: 0, y: 1 };
        activeGameServiceStub.actionMode.set(true);
        activeGameServiceStub.getCurrentPlayer.and.returnValue(currentPlayer);
        activeGameServiceStub.getPlayersAtPosition.and.returnValue([]);

        component.onGridCellClick(createGridCellEvent(1, 1, CellType.Empty, sanctuary));
        component.onDocumentClick(createDocumentClickEvent('grid-container'));

        expect(popupStateService.isSanctuaryPopupVisible).toBeTrue();
        expect(activeGameServiceStub.interactSanctuary).not.toHaveBeenCalled();
    });

    it('should block keyboard movement while a sanctuary popup is visible', () => {
        popupStateService.isSanctuaryPopupVisible = true;
        component.handleKeyboard(createKeyboardEvent('w'));

        expect(activeGameServiceStub.tryMove).not.toHaveBeenCalled();
    });

    it('should close the sanctuary popup when the turn changes', () => {
        const sanctuary = createSanctuaryItem(1, 1);
        const currentPlayer = createCharacter('Alice');
        currentPlayer.positionGrille = { x: 0, y: 1 };
        activeGameServiceStub.actionMode.set(true);
        activeGameServiceStub.getCurrentPlayer.and.returnValue(currentPlayer);
        activeGameServiceStub.getPlayersAtPosition.and.returnValue([]);

        component.onGridCellClick(createGridCellEvent(1, 1, CellType.Empty, sanctuary));
        expect(popupStateService.isSanctuaryPopupVisible).toBeTrue();

        activeGameServiceStub.getCurrentPlayer.and.returnValue(createCharacter('Bob'));
        activeGameServiceStub.currentPlayer.set(1);
        fixture.detectChanges();

        expect(popupStateService.isSanctuaryPopupVisible).toBeFalse();
        expect(popupStateService.sanctuaryPopupTitle).toBe('');
        expect(popupStateService.sanctuaryPopupDescription).toBe('');
    });

    it('should send the sanctuary interaction when a popup choice is selected', () => {
        popupStateService.sanctuaryPopupPosition = {
            x: SANCTUARY_INTERACTION_COL,
            y: SANCTUARY_INTERACTION_ROW,
        };
        popupStateService.isSanctuaryPopupVisible = true;

        component.onSanctuaryChoice('double');

        expect(activeGameServiceStub.interactSanctuary).toHaveBeenCalledWith(SANCTUARY_INTERACTION_ROW, SANCTUARY_INTERACTION_COL, 'double');
        expect(popupStateService.isSanctuaryPopupVisible).toBeFalse();
        expect(activeGameServiceStub.actionMode()).toBeFalse();
    });

    it('should keep tile info instead of toggling when a flag or player occupies a door tile', () => {
        activeGameServiceStub.isDebugMode.and.returnValue(false);
        boardSharedServiceSpy.getObjectAt.and.returnValue({ itemType: ItemType.Flag } as never);

        component.onCellRightClick(createContextMenuEvent(), 1, 1, CellType.OpenDoor);

        expect(activeGameServiceStub.toggleDoor).not.toHaveBeenCalled();
        expect(popupStateService.isTileInfoVisible).toBeTrue();

        boardSharedServiceSpy.getObjectAt.and.returnValue(null);
        activeGameServiceStub.getPlayersAtPosition.and.returnValue([createCharacter('Bob')]);

        component.onCellRightClick(createContextMenuEvent(), 1, 1, CellType.OpenDoor);

        expect(activeGameServiceStub.toggleDoor).not.toHaveBeenCalled();
    });

    it('should expose tile info popup data from current component state', () => {
        popupStateService.isTileInfoVisible = true;
        popupStateService.tileInfoTitle = 'Tile';
        popupStateService.tileInfoDescription = 'Desc';
        popupStateService.tileInfoMovementCost = '1';
        popupStateService.tileInfoItemTitle = 'Item';
        popupStateService.tileInfoItemDescription = 'Item desc';
        popupStateService.tileInfoPlayerName = 'Alice';
        popupStateService.tileInfoPlayerAvatarUrl = '/avatar.png';

        const popupData = (component as unknown as { tileInfoPopupData: unknown }).tileInfoPopupData as Record<string, unknown>;

        expect(popupData).toEqual({
            visible: true,
            title: 'Tile',
            description: 'Desc',
            movementCost: '1',
            itemTitle: 'Item',
            itemDescription: 'Item desc',
            playerName: 'Alice',
            playerAvatarUrl: '/avatar.png',
        });
    });

    it('should close tile info on document click', () => {
        popupStateService.isTileInfoVisible = true;
        popupStateService.tileInfoItemTitle = 'Item';
        popupStateService.tileInfoItemDescription = 'Desc';
        popupStateService.tileInfoPlayerName = 'Alice';
        popupStateService.tileInfoPlayerAvatarUrl = '/avatar.png';
        popupStateService.isSanctuaryPopupVisible = true;
        popupStateService.sanctuaryPopupTitle = 'Sanctuaire';

        component.onDocumentClick(createDocumentClickEvent());

        expect(popupStateService.isTileInfoVisible).toBeFalse();
        expect(popupStateService.tileInfoItemTitle).toBeNull();
        expect(popupStateService.tileInfoItemDescription).toBeNull();
        expect(popupStateService.tileInfoPlayerName).toBeNull();
        expect(popupStateService.tileInfoPlayerAvatarUrl).toBeNull();
        expect(popupStateService.isSanctuaryPopupVisible).toBeFalse();
        expect(popupStateService.sanctuaryPopupTitle).toBe('');
        expect(activeGameServiceStub.interactSanctuary).not.toHaveBeenCalled();
    });

    it('should run movement-range effect when tracked signals change', () => {
        component.totalColumns = BOARD_SIDE_SIZE;
        component.graph = Array.from({ length: BOARD_NODE_COUNT }, () => []);
        activeGameServiceStub.updateMovementRange.calls.reset();

        fixture.detectChanges();
        const callsAfterInit = activeGameServiceStub.updateMovementRange.calls.count();

        activeGameServiceStub.hasChangedLocation.set(true);
        fixture.detectChanges();

        expect(activeGameServiceStub.updateMovementRange.calls.count()).toBeGreaterThan(callsAfterInit);
    });

    // Edge case: When debug mode is disabled, it should not teleport.
    it('should not teleport when debug mode is disabled', () => {
        activeGameServiceStub.isDebugMode.and.returnValue(false);

        component.onCellRightClick(createContextMenuEvent(), 0, 0, CellType.Empty);

        expect(activeGameServiceStub.debugTeleport).not.toHaveBeenCalled();
    });

    // Edge case: When cell is blocked by wall, object, or player, it should not teleport.
    it('should not teleport when cell is blocked by wall, object, or player', () => {
        activeGameServiceStub.isDebugMode.and.returnValue(true);

        component.onCellRightClick(createContextMenuEvent(), 0, 0, CellType.Wall);
        expect(activeGameServiceStub.debugTeleport).not.toHaveBeenCalled();

        component.onCellRightClick(createContextMenuEvent(), 0, 0, CellType.ClosedDoor);
        expect(activeGameServiceStub.debugTeleport).not.toHaveBeenCalled();
        expect(activeGameServiceStub.toggleDoor).not.toHaveBeenCalled();

        boardSharedServiceSpy.getObjectAt.and.returnValue({ itemType: ItemType.Flag } as never);
        component.onCellRightClick(createContextMenuEvent(), 0, 1, CellType.Empty);
        expect(activeGameServiceStub.debugTeleport).not.toHaveBeenCalled();

        boardSharedServiceSpy.getObjectAt.and.returnValue(null);
        activeGameServiceStub.getPlayersAtPosition.and.returnValue([createCharacter('Bob')]);
        component.onCellRightClick(createContextMenuEvent(), 1, 1, CellType.Empty);
        expect(activeGameServiceStub.debugTeleport).not.toHaveBeenCalled();
        expect(activeGameServiceStub.toggleDoor).not.toHaveBeenCalled();
    });

    // Edge case: When the active turn belongs to another player, debug teleport must be blocked.
    it('should not teleport when it is not local player turn', () => {
        activeGameServiceStub.isDebugMode.and.returnValue(true);
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Bob'));
        activeGameServiceStub.getCurrentPlayer.and.returnValue(createCharacter('Alice'));

        component.onCellRightClick(createContextMenuEvent(), 1, 1, CellType.Empty);

        expect(activeGameServiceStub.debugTeleport).not.toHaveBeenCalled();
    });

    it('should teleport on right click when debug mode is active and cell is valid', () => {
        activeGameServiceStub.isDebugMode.and.returnValue(true);
        boardSharedServiceSpy.getObjectAt.and.returnValue(null);
        activeGameServiceStub.getPlayersAtPosition.and.returnValue([]);

        component.onCellRightClick(createContextMenuEvent(), 1, 1, CellType.Empty);

        expect(activeGameServiceStub.debugTeleport).toHaveBeenCalledWith(1, 1);
    });
});

function createActiveGame(players: ICharacter[]): IActiveGame {
    const game: IGame = {
        gameTitle: 'Arena',
        description: '',
        gameMode: GameType.Classic,
        dateCreated: new Date('2026-01-01T00:00:00.000Z'),
        lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
        visibility: Visibility.Hidden,
        board: {
            cells: [
                [CellType.Empty, CellType.Empty],
                [CellType.Empty, CellType.Empty],
            ],
            items: [],
        },
    };

    return {
        _id: 'active-game-1',
        game,
        players,
        currentPlayerIndex: 0,
        turnOrder: players.map((player) => player.name),
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Organizer',
        maxPlayerCount: PLAYER_COUNT_LIMIT,
        turnIsInPreparation: false,
        hasFlagId: '',

        turnStartTimeStamp: 0,
        currentAttack: null,
    };
}

function createCharacter(name: string): ICharacter {
    return {
        name,
        avatar: Avatar.Avatar1,
        initialHealth: 10,
        currentHealth: 10,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints: 4,
        attackPoints: 4,
        defensePoints: 4,
        actionsLeft: 1,
        movementLeft: 4,
        victories: 0,
        hasAbandoned: false,
        positionDepart: { x: 0, y: 0 },
        positionGrille: { x: 0, y: 0 },

        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}

function createKeyboardEvent(key: string, chatTarget = false): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key });

    if (chatTarget) {
        const input = document.createElement('input');
        input.setAttribute('data-chat-message-input', '');
        Object.defineProperty(event, 'target', { value: input });
    }

    return event;
}

function createContextMenuEvent(): MouseEvent {
    return new MouseEvent('contextmenu');
}

function createDocumentClickEvent(targetId?: string): MouseEvent {
    const event = new MouseEvent('click');
    const target = document.createElement('div');

    if (targetId) {
        target.id = targetId;
        const child = document.createElement('div');
        target.appendChild(child);
        Object.defineProperty(event, 'target', { value: child });
        return event;
    }

    Object.defineProperty(event, 'target', { value: document.createElement('div') });
    return event;
}

function createGridCellEvent(
    rowIndex: number,
    colIndex: number,
    cellType: CellType,
    item: IItem | null = null,
): Parameters<GameComponent['onGridCellClick']>[0] {
    return {
        rowIndex,
        colIndex,
        cellType,
        item,
        event: new MouseEvent('click'),
    };
}

function createSanctuaryItem(x: number, y: number): IItem {
    return {
        itemType: ItemType.LifeSanctuary,
        x,
        y,
        size: 4,
    };
}
