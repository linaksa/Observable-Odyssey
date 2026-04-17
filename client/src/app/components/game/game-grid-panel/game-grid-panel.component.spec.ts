/* eslint-disable @typescript-eslint/no-magic-numbers -- To make the spec file easier to read */
/* eslint-disable max-lines -- This spec covers grid rendering, tooltip behavior, and interaction delegation together. */
/**
 * Testing strategy — Game Grid Panel Component
 *
 * Approach:
 * - Treat the grid panel as a coordinator and assert service-driven computed state plus interaction delegation.
 * - Validate combat, tooltip, and sanctuary flows through deterministic signal changes and explicit spy assertions.
 *
 * Edge cases covered:
 * - Missing active-game ownership or tile metadata should gracefully fall back to empty/default view state.
 * - Sanctuary and tooltip states should reset predictably when timers, hover context, or popup visibility change.
 */
import { Component, signal } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { GameGridPanelComponent } from '@app/components/game/game-grid-panel/game-grid-panel.component';
import { GameGridCellEvent } from '@app/interfaces/game-grid.interface';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameInteractionService } from '@app/services/gameplay/game-interaction.service';
import { GamePopupStateService } from '@app/services/gameplay/game-popup-state.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { SanctuaryChoice, SanctuaryPopupData, TileInfoPopupData } from '@common/info';
import { IItem, ItemType } from '@common/items';

describe('GameGridPanelComponent', () => {
    let fixture: ComponentFixture<GameGridPanelComponent>;
    let component: GameGridPanelComponent;

    let alice: ICharacter;
    let bob: ICharacter;

    let activeGameServiceStub: {
        isDebugMode: ReturnType<typeof signal<boolean>>;
        hasChangedLocation: ReturnType<typeof signal<boolean>>;
        hasAbandoned: ReturnType<typeof signal<boolean>>;
        gameHasEnded: ReturnType<typeof signal<boolean>>;
        currentPlayer: ReturnType<typeof signal<number>>;
        pendingFlagRequest: ReturnType<typeof signal<unknown>>;
        activeGame: IActiveGame | undefined;
        reachableTiles: ReadonlySet<number>;
        updateMovementRange: jasmine.Spy;
        getCurrentPlayer: jasmine.Spy<() => ICharacter | undefined>;
        respondToFlagActionRequest: jasmine.Spy;
        getPlayersAtPosition: jasmine.Spy<(row: number, col: number) => ICharacter[]>;
        getSpawnPointOwnerName: jasmine.Spy<(item: IItem | null) => string | null>;
    };
    let boardSharedServiceSpy: jasmine.SpyObj<Pick<BoardSharedService, 'getObjectAt'>>;
    let localPlayerServiceSpy: jasmine.SpyObj<Pick<LocalPlayerService, 'getLocalPlayer'>>;
    let interactionServiceSpy: jasmine.SpyObj<
        Pick<
            GameInteractionService,
            'handleCellRightClick' | 'handleGridCellClick' | 'handlePlayerClick' | 'handleSanctuaryChoice' | 'handleDocumentClick' | 'handleKeyboard'
        >
    >;
    let popupStateServiceStub: {
        isSanctuaryPopupVisible: boolean;
        tileInfoPopupData: TileInfoPopupData;
        sanctuaryPopupData: SanctuaryPopupData;
        closeSanctuaryPopup: jasmine.Spy;
        closeTileInfo: jasmine.Spy;
        openTileInfo: jasmine.Spy;
    };
    let gameTurnServiceStub: {
        turnTimeLeftSeconds: ReturnType<typeof signal<number | null>>;
    };

    beforeEach(async () => {
        alice = createCharacter('Alice', 0, 0);
        bob = createCharacter('Bob', 1, 0);

        activeGameServiceStub = {
            isDebugMode: signal(false),
            hasChangedLocation: signal(false),
            hasAbandoned: signal(false),
            gameHasEnded: signal(false),
            currentPlayer: signal(0),
            pendingFlagRequest: signal(null),
            activeGame: createActiveGame('Arena', 'A strategic arena', [alice, bob]),
            reachableTiles: new Set<number>([0, 1]),
            updateMovementRange: jasmine.createSpy('updateMovementRange'),
            getCurrentPlayer: jasmine.createSpy('getCurrentPlayer').and.returnValue(alice),
            respondToFlagActionRequest: jasmine.createSpy('respondToFlagActionRequest'),
            getPlayersAtPosition: jasmine.createSpy('getPlayersAtPosition').and.returnValue([]),
            getSpawnPointOwnerName: jasmine.createSpy('getSpawnPointOwnerName').and.returnValue(null),
        };

        boardSharedServiceSpy = jasmine.createSpyObj<Pick<BoardSharedService, 'getObjectAt'>>('BoardSharedService', ['getObjectAt']);
        boardSharedServiceSpy.getObjectAt.and.returnValue(null);

        localPlayerServiceSpy = jasmine.createSpyObj<Pick<LocalPlayerService, 'getLocalPlayer'>>('LocalPlayerService', ['getLocalPlayer']);
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(alice);

        interactionServiceSpy = jasmine.createSpyObj<
            Pick<
                GameInteractionService,
                | 'handleCellRightClick'
                | 'handleGridCellClick'
                | 'handlePlayerClick'
                | 'handleSanctuaryChoice'
                | 'handleDocumentClick'
                | 'handleKeyboard'
            >
        >('GameInteractionService', [
            'handleCellRightClick',
            'handleGridCellClick',
            'handlePlayerClick',
            'handleSanctuaryChoice',
            'handleDocumentClick',
            'handleKeyboard',
        ]);

        popupStateServiceStub = {
            isSanctuaryPopupVisible: false,
            tileInfoPopupData: {
                visible: false,
                title: '',
                description: '',
                movementCost: '',
                itemTitle: null,
                itemDescription: null,
                playerName: null,
                playerAvatarUrl: null,
            },
            sanctuaryPopupData: {
                visible: false,
                title: '',
                description: '',
                effectLabel: '',
            },
            closeSanctuaryPopup: jasmine.createSpy('closeSanctuaryPopup'),
            closeTileInfo: jasmine.createSpy('closeTileInfo'),
            openTileInfo: jasmine.createSpy('openTileInfo'),
        };

        gameTurnServiceStub = {
            turnTimeLeftSeconds: signal(19),
        };

        const overrideInfo: MetadataOverride<Component> = {
            set: {
                template: '',
                imports: [],
            },
        };
        TestBed.overrideComponent(GameGridPanelComponent, overrideInfo);

        await TestBed.configureTestingModule({
            imports: [GameGridPanelComponent],
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: BoardSharedService, useValue: boardSharedServiceSpy },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
                { provide: GameInteractionService, useValue: interactionServiceSpy },
                { provide: GamePopupStateService, useValue: popupStateServiceStub },
                { provide: GameTurnService, useValue: gameTurnServiceStub },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameGridPanelComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('derives title, board, player values and movement graph updates from active game state', () => {
        // Nominal case: populated active game produces rich panel state and movement graph updates.
        const panel = component as unknown as {
            gameTitle: () => string;
            gameDescription: () => string;
            gameCells: () => CellType[][];
            gamePlayers: () => readonly ICharacter[];
            titleLabel: () => string;
            reachableTiles: ReadonlySet<number> | null;
        };

        expect(panel.gameTitle()).toBe('Arena');
        expect(panel.gameDescription()).toBe('A strategic arena');
        expect(panel.gameCells().length).toBe(2);
        expect(panel.titleLabel()).toBe('Arena (2×2)');

        const clonedPlayers = panel.gamePlayers();
        const sourcePlayers = activeGameServiceStub.activeGame?.players;
        expect(clonedPlayers).toEqual(sourcePlayers ?? []);

        if (sourcePlayers) {
            expect(clonedPlayers).not.toBe(sourcePlayers);
        }
        expect(panel.reachableTiles).toBe(activeGameServiceStub.reachableTiles);

        const [columns, graph] = activeGameServiceStub.updateMovementRange.calls.mostRecent().args as [number, [number, number][][]];
        expect(columns).toBe(2);
        expect(graph.length).toBe(4);
    });

    it('falls back to empty/default values and null movement hints when game or turn ownership is missing', () => {
        // Edge case: missing ownership/game data must avoid stale movement hints and labels.
        const panel = component as unknown as {
            gameDescription: () => string;
            gamePlayers: () => readonly ICharacter[];
            titleLabel: () => string;
            reachableTiles: ReadonlySet<number> | null;
        };

        activeGameServiceStub.activeGame = undefined;
        activeGameServiceStub.getCurrentPlayer.and.returnValue(bob);
        activeGameServiceStub.hasChangedLocation.update((current: boolean) => !current);
        fixture.detectChanges();

        expect(panel.titleLabel()).toBe('Partie (0×0)');
        expect(panel.gameDescription()).toBe('');
        expect(panel.gamePlayers()).toEqual([]);
        expect(panel.reachableTiles).toBeNull();
        expect(component.getObjectAt(0, 0)).toBeNull();

        const [columns, graph] = activeGameServiceStub.updateMovementRange.calls.mostRecent().args as [number, [number, number][][]];
        expect(columns).toBe(0);
        expect(graph).toEqual([]);
    });

    it('manages title tooltip visibility and position only when description exists', () => {
        const panel = component as unknown as {
            titleTooltip: () => string | null;
            titleTooltipVisible: boolean;
            titleTooltipPosition: () => { x: number; y: number };
            showTitleTooltip: (event: MouseEvent) => void;
            updateTitleTooltip: (event: MouseEvent) => void;
            hideTitleTooltip: () => void;
        };

        // Edge case: cursor move should be ignored when title tooltip is currently hidden.
        const initialPosition = panel.titleTooltipPosition();
        panel.updateTitleTooltip(createMouseMoveEvent(300, 400, null));
        expect(panel.titleTooltipPosition()).toEqual(initialPosition);

        panel.showTitleTooltip(createMouseMoveEvent(40, 50, null));
        expect(panel.titleTooltipVisible).toBeTrue();
        expect(panel.titleTooltip()).toBe('A strategic arena');
        expect(panel.titleTooltipPosition()).toEqual({ x: 52, y: 58 });

        panel.updateTitleTooltip(createMouseMoveEvent(80, 90, null));
        expect(panel.titleTooltipPosition()).toEqual({ x: 92, y: 98 });

        panel.hideTitleTooltip();
        expect(panel.titleTooltipVisible).toBeFalse();
        expect(panel.titleTooltip()).toBeNull();

        activeGameServiceStub.activeGame = createActiveGame('Arena', '', [alice, bob]);
        activeGameServiceStub.hasChangedLocation.update((current: boolean) => !current);
        fixture.detectChanges();

        panel.showTitleTooltip(createMouseMoveEvent(20, 20, null));
        expect(panel.titleTooltip()).toBeNull();
    });

    it('delegates click, context, keyboard, and sanctuary decision events to services', () => {
        const panel = component as unknown as {
            tileInfoPopupData: TileInfoPopupData;
            sanctuaryPopupData: SanctuaryPopupData;
            tileInfoTooltipPosition: () => { x: number; y: number };
            onGridCellContextMenu: (event: GameGridCellEvent) => void;
            onGridCellClick: (event: GameGridCellEvent) => void;
            onPlayerClicked: (player: ICharacter) => void;
            onSanctuaryChoice: (choice: SanctuaryChoice) => void;
            onFlagTransferDecision: (accepted: boolean) => void;
            onSanctuaryCancel: () => void;
            handleKeyboard: (event: KeyboardEvent) => void;
            handleDocumentClick: (event?: MouseEvent) => void;
        };

        // Accessing popup getters ensures template-facing state accessors are covered.
        expect(panel.tileInfoPopupData).toBe(popupStateServiceStub.tileInfoPopupData);
        expect(panel.sanctuaryPopupData).toBe(popupStateServiceStub.sanctuaryPopupData);

        popupStateServiceStub.tileInfoPopupData.visible = true;
        const contextEvent = createMouseMoveEvent(24, 32, document.body);
        const cellItem = createItem(ItemType.Flag, 0, 0);
        panel.onGridCellContextMenu({ rowIndex: 1, colIndex: 0, cellType: CellType.Water, item: cellItem, event: contextEvent });

        expect(interactionServiceSpy.handleCellRightClick).toHaveBeenCalledWith(contextEvent, 1, 0, CellType.Water, cellItem);
        expect(panel.tileInfoTooltipPosition()).toEqual({ x: 36, y: 40 });

        panel.onGridCellClick({ rowIndex: 0, colIndex: 1, cellType: CellType.Empty, item: null, event: contextEvent });
        expect(interactionServiceSpy.handleGridCellClick).toHaveBeenCalledWith(0, 1, CellType.Empty, null);

        panel.onPlayerClicked(bob);
        expect(interactionServiceSpy.handlePlayerClick).toHaveBeenCalledWith('Bob');

        panel.onSanctuaryChoice(SanctuaryChoice.Double);
        expect(interactionServiceSpy.handleSanctuaryChoice).toHaveBeenCalledWith(SanctuaryChoice.Double);

        panel.onFlagTransferDecision(true);
        expect(activeGameServiceStub.respondToFlagActionRequest).toHaveBeenCalledWith(true);

        panel.onSanctuaryCancel();
        expect(interactionServiceSpy.handleDocumentClick).toHaveBeenCalledWith();

        const keyboardEvent = new KeyboardEvent('keydown', { key: 'w' });
        panel.handleKeyboard(keyboardEvent);
        expect(interactionServiceSpy.handleKeyboard).toHaveBeenCalledWith(keyboardEvent, 2);

        panel.handleDocumentClick(contextEvent);
        expect(interactionServiceSpy.handleDocumentClick).toHaveBeenCalledWith(contextEvent);
    });

    it('closes tile inspection on invalid hover targets and opens detailed info on valid hovered cells', () => {
        const panel = component as unknown as {
            tileInfoTooltipPosition: () => { x: number; y: number };
            handleWindowMouseMove: (event: MouseEvent) => void;
        };

        popupStateServiceStub.tileInfoPopupData.visible = false;
        panel.handleWindowMouseMove(createMouseMoveEvent(10, 10, null));
        expect(popupStateServiceStub.closeTileInfo).not.toHaveBeenCalled();

        popupStateServiceStub.tileInfoPopupData.visible = true;
        panel.handleWindowMouseMove(createMouseMoveEvent(10, 10, null));
        expect(popupStateServiceStub.closeTileInfo).toHaveBeenCalledTimes(1);

        const invalidCell = document.createElement('div');
        invalidCell.setAttribute('data-testid', 'game-grid-cell');
        invalidCell.dataset.rowIndex = 'not-a-number';
        invalidCell.dataset.colIndex = '0';
        panel.handleWindowMouseMove(createMouseMoveEvent(12, 12, invalidCell));
        expect(popupStateServiceStub.closeTileInfo).toHaveBeenCalledTimes(2);

        const outOfBoundsCell = document.createElement('div');
        outOfBoundsCell.setAttribute('data-testid', 'game-grid-cell');
        outOfBoundsCell.dataset.rowIndex = '9';
        outOfBoundsCell.dataset.colIndex = '9';
        panel.handleWindowMouseMove(createMouseMoveEvent(15, 15, outOfBoundsCell));
        expect(popupStateServiceStub.closeTileInfo).toHaveBeenCalledTimes(3);

        // Edge case: closest() returning a non-HTMLElement should be rejected safely.
        const mockedTarget = document.createElement('div');
        spyOn(mockedTarget, 'closest').and.returnValue({ dataset: { rowIndex: '1', colIndex: '0' } } as unknown as Element);
        panel.handleWindowMouseMove(createMouseMoveEvent(16, 16, mockedTarget));
        expect(popupStateServiceStub.closeTileInfo).toHaveBeenCalledTimes(4);

        popupStateServiceStub.closeTileInfo.calls.reset();
        const validCell = document.createElement('div');
        validCell.setAttribute('data-testid', 'game-grid-cell');
        validCell.dataset.rowIndex = '1';
        validCell.dataset.colIndex = '0';

        const hoveredItem = createItem(ItemType.StartingPosition, 0, 1);
        // Edge case: no player on the hovered cell should pass null to popup state.
        activeGameServiceStub.getPlayersAtPosition.and.returnValue([]);
        boardSharedServiceSpy.getObjectAt.and.returnValue(hoveredItem);
        activeGameServiceStub.getSpawnPointOwnerName.and.returnValue('Spawn owner');

        panel.handleWindowMouseMove(createMouseMoveEvent(44, 66, validCell));

        expect(popupStateServiceStub.openTileInfo).toHaveBeenCalledWith(CellType.Water, hoveredItem, null, 'Spawn owner');
        expect(panel.tileInfoTooltipPosition()).toEqual({ x: 56, y: 74 });
    });

    it('auto-closes sanctuary popup when local turn is lost or game has ended', () => {
        popupStateServiceStub.isSanctuaryPopupVisible = true;

        activeGameServiceStub.getCurrentPlayer.and.returnValue(bob);
        activeGameServiceStub.currentPlayer.update((index: number) => index + 1);
        fixture.detectChanges();
        expect(popupStateServiceStub.closeSanctuaryPopup).toHaveBeenCalled();

        popupStateServiceStub.closeSanctuaryPopup.calls.reset();
        activeGameServiceStub.getCurrentPlayer.and.returnValue(alice);
        activeGameServiceStub.gameHasEnded.set(false);
        activeGameServiceStub.currentPlayer.update((index: number) => index + 1);
        fixture.detectChanges();
        expect(popupStateServiceStub.closeSanctuaryPopup).not.toHaveBeenCalled();

        activeGameServiceStub.gameHasEnded.set(true);
        fixture.detectChanges();
        expect(popupStateServiceStub.closeSanctuaryPopup).toHaveBeenCalled();
    });
});

function createMouseMoveEvent(clientX: number, clientY: number, target: EventTarget | null): MouseEvent {
    return { clientX, clientY, target } as MouseEvent;
}

function createActiveGame(gameTitle: string, description: string, players: ICharacter[]): IActiveGame {
    const game: IGame = {
        gameTitle,
        description,
        gameMode: GameType.Classic,
        dateCreated: new Date('2026-01-01T00:00:00.000Z'),
        lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
        visibility: Visibility.Hidden,
        board: {
            cells: [
                [CellType.Empty, CellType.Ice],
                [CellType.Water, CellType.OpenDoor],
            ],
            items: [createItem(ItemType.FightSanctuary, 0, 0)],
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
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: null,
        turnStartTimeStamp: 0,
        currentAttack: null,
    };
}

function createCharacter(name: string, x: number, y: number): ICharacter {
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
        startingPosition: { x, y },
        currentPosition: { x, y },
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}

function createItem(itemType: ItemType, x: number, y: number): IItem {
    return {
        itemType,
        x,
        y,
        size: itemType === ItemType.FightSanctuary || itemType === ItemType.LifeSanctuary ? 4 : 1,
        active: true,
    };
}
