/* eslint-disable @typescript-eslint/no-magic-numbers -- To make the spec file easier to read */
/* eslint-disable max-lines -- This spec covers multiple interaction branches and edge cases in one suite. */
/**
 * Testing strategy — GameInteractionService
 *
 * Approach:
 * - Drive grid clicks, sanctuary choices, and keyboard events through mocked gameplay collaborators.
 * - Assert movement attempts, popup interactions, and emitted sanctuary decisions from the public API.
 *
 * Edge cases covered:
 * - Used sanctuaries and pending flag-transfer requests block interaction side effects.
 * - Physical keyboard layout handling keeps movement consistent across key labels.
 */
import { TestBed } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameInteractionService } from '@app/services/gameplay/game-interaction.service';
import { GamePopupStateService } from '@app/services/gameplay/game-popup-state.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { SanctuaryChoice } from '@common/info';
import { IItem, ItemType } from '@common/items';
import { SocketEvent } from '@common/socket-events';

type ActionModeSignalSpy = jasmine.Spy<() => boolean> & { set: jasmine.Spy };
type ActiveGameServiceSpy = jasmine.SpyObj<
    Pick<ActiveGameService, 'getCurrentPlayer' | 'getPlayersAtPosition' | 'interactSanctuary' | 'pendingFlagRequest' | 'tryMove'>
> & {
    actionMode: ActionModeSignalSpy;
};
type GamePopupStateServiceSpy = jasmine.SpyObj<Pick<GamePopupStateService, 'closeAllPopups' | 'openSanctuaryPopup' | 'closeSanctuaryPopup'>> & {
    sanctuaryPopupPosition: { x: number; y: number } | null;
};

describe('GameInteractionService', () => {
    const SANCTUARY_ROW = 5;
    const SANCTUARY_COLUMN = 6;
    const TOTAL_COLUMNS = 8;

    let service: GameInteractionService;
    let activeGameServiceSpy: ActiveGameServiceSpy;
    let popupStateServiceSpy: GamePopupStateServiceSpy;
    let localPlayerServiceSpy: jasmine.SpyObj<Pick<LocalPlayerService, 'getLocalPlayer'>>;
    let boardSharedServiceSpy: jasmine.SpyObj<Pick<BoardSharedService, 'getObjectAt'>>;
    let currentPlayer: ICharacter;
    let actionModeSpy: ActionModeSignalSpy;

    beforeEach(() => {
        currentPlayer = createPlayer();

        activeGameServiceSpy = jasmine.createSpyObj<
            Pick<ActiveGameService, 'getCurrentPlayer' | 'getPlayersAtPosition' | 'interactSanctuary' | 'pendingFlagRequest' | 'tryMove'>
        >('ActiveGameService', [
            'getCurrentPlayer',
            'getPlayersAtPosition',
            'interactSanctuary',
            'pendingFlagRequest',
            'tryMove',
        ]) as ActiveGameServiceSpy;
        popupStateServiceSpy = jasmine.createSpyObj<Pick<GamePopupStateService, 'closeAllPopups' | 'openSanctuaryPopup' | 'closeSanctuaryPopup'>>(
            'GamePopupStateService',
            ['closeAllPopups', 'openSanctuaryPopup', 'closeSanctuaryPopup'],
        ) as GamePopupStateServiceSpy;
        localPlayerServiceSpy = jasmine.createSpyObj<Pick<LocalPlayerService, 'getLocalPlayer'>>('LocalPlayerService', ['getLocalPlayer']);
        boardSharedServiceSpy = jasmine.createSpyObj<Pick<BoardSharedService, 'getObjectAt'>>('BoardSharedService', ['getObjectAt']);

        actionModeSpy = jasmine.createSpy<() => boolean>('actionMode').and.returnValue(true) as ActionModeSignalSpy;
        actionModeSpy.set = jasmine.createSpy('actionMode.set');
        activeGameServiceSpy.actionMode = actionModeSpy;

        (activeGameServiceSpy.getCurrentPlayer as jasmine.Spy).and.returnValue(currentPlayer);
        (activeGameServiceSpy.getPlayersAtPosition as jasmine.Spy).and.returnValue([]);
        (activeGameServiceSpy.interactSanctuary as jasmine.Spy).and.stub();
        (activeGameServiceSpy.tryMove as jasmine.Spy).and.stub();
        (activeGameServiceSpy.pendingFlagRequest as jasmine.Spy).and.returnValue(null);
        (popupStateServiceSpy.closeAllPopups as jasmine.Spy).and.stub();
        (popupStateServiceSpy.openSanctuaryPopup as jasmine.Spy).and.stub();
        (popupStateServiceSpy.closeSanctuaryPopup as jasmine.Spy).and.stub();
        (localPlayerServiceSpy.getLocalPlayer as jasmine.Spy).and.returnValue(currentPlayer);
        (boardSharedServiceSpy.getObjectAt as jasmine.Spy).and.returnValue(null);
        popupStateServiceSpy.sanctuaryPopupPosition = null;

        TestBed.configureTestingModule({
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceSpy },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
                { provide: BoardSharedService, useValue: boardSharedServiceSpy },
                { provide: GamePopupStateService, useValue: popupStateServiceSpy },
            ],
        });

        service = TestBed.inject(GameInteractionService);
    });

    it('should not open the sanctuary popup for a used sanctuary', () => {
        // Edge case: inactive sanctuaries should not reopen interaction choices.
        const usedSanctuary = createSanctuary({ active: false, inactiveTurnsRemaining: 0 });

        service.handleGridCellClick(SANCTUARY_ROW, SANCTUARY_COLUMN, CellType.Empty, usedSanctuary);

        expect(popupStateServiceSpy.openSanctuaryPopup).not.toHaveBeenCalled();
    });

    it('should still open the sanctuary popup for an available sanctuary', () => {
        // Nominal case: active sanctuaries remain interactable.
        const availableSanctuary = createSanctuary({ active: true, inactiveTurnsRemaining: 0 });

        service.handleGridCellClick(SANCTUARY_ROW, SANCTUARY_COLUMN, CellType.Empty, availableSanctuary);

        expect(popupStateServiceSpy.openSanctuaryPopup).toHaveBeenCalled();
    });

    it('should still open sanctuary popup when stale client state keeps a cooldown counter on an active sanctuary', () => {
        // Edge case: stale cooldown counters must not block an active sanctuary.
        const staleSanctuary = createSanctuary({ active: true, inactiveTurnsRemaining: 1 });

        service.handleGridCellClick(SANCTUARY_ROW, SANCTUARY_COLUMN, CellType.Empty, staleSanctuary);

        expect(popupStateServiceSpy.openSanctuaryPopup).toHaveBeenCalled();
    });

    it('should emit sanctuary interaction when the player selects a choice', () => {
        // Nominal case: choosing an option emits interaction and exits action mode.
        popupStateServiceSpy.sanctuaryPopupPosition = {
            x: SANCTUARY_COLUMN,
            y: SANCTUARY_ROW,
        };

        service.handleSanctuaryChoice(SanctuaryChoice.Standard);

        expect(activeGameServiceSpy.interactSanctuary).toHaveBeenCalledWith(SANCTUARY_ROW, SANCTUARY_COLUMN, SanctuaryChoice.Standard);
        expect(actionModeSpy.set).toHaveBeenCalledWith(false);
        expect(popupStateServiceSpy.closeSanctuaryPopup).toHaveBeenCalled();
    });

    it('should open the sanctuary popup again after sanctuary cooldown has fully expired', () => {
        // Edge case: undefined cooldown after reactivation should behave like available.
        const reactivatedSanctuary = createSanctuary({
            active: true,
            inactiveTurnsRemaining: undefined,
        });

        service.handleGridCellClick(SANCTUARY_ROW, SANCTUARY_COLUMN, CellType.Empty, reactivatedSanctuary);

        expect(popupStateServiceSpy.openSanctuaryPopup).toHaveBeenCalled();
    });

    it('should block grid interactions while a flag transfer decision is pending', () => {
        // Edge case: pending flag decisions must short-circuit regular grid interactions.
        (activeGameServiceSpy.pendingFlagRequest as jasmine.Spy).and.returnValue({
            data: {
                gameId: 'game-1',
                currentPlayerName: 'Alice',
                currentPlayerActionsLeft: 0,
                targetPlayerName: 'Bob',
            },
            acceptEvent: SocketEvent.TakeFlag,
            question: 'En attente',
            canRespond: false,
        });

        service.handleGridCellClick(SANCTUARY_ROW, SANCTUARY_COLUMN, CellType.Empty, createSanctuary({ active: true }));

        expect(popupStateServiceSpy.closeAllPopups).not.toHaveBeenCalled();
        expect(popupStateServiceSpy.openSanctuaryPopup).not.toHaveBeenCalled();
    });

    it('should move with the physical W key', () => {
        // Nominal case: keyboard handling follows the physical WASD layout.
        service.handleKeyboard(new KeyboardEvent('keydown', { code: 'KeyW', key: 'w' }), TOTAL_COLUMNS);

        expect(popupStateServiceSpy.closeSanctuaryPopup).toHaveBeenCalled();
        expect(activeGameServiceSpy.tryMove).toHaveBeenCalledWith(-1, 0, TOTAL_COLUMNS);
    });

    it('should move with the physical Z key on an AZERTY keyboard', () => {
        // Edge case: AZERTY input still maps by key code to upward movement.
        service.handleKeyboard(new KeyboardEvent('keydown', { code: 'KeyW', key: 'z' }), TOTAL_COLUMNS);

        expect(popupStateServiceSpy.closeSanctuaryPopup).toHaveBeenCalled();
        expect(activeGameServiceSpy.tryMove).toHaveBeenCalledWith(-1, 0, TOTAL_COLUMNS);
    });

    function createPlayer(): ICharacter {
        return {
            name: 'Alice',
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
            startingPosition: { x: SANCTUARY_COLUMN - 1, y: SANCTUARY_ROW },
            currentPosition: { x: SANCTUARY_COLUMN - 1, y: SANCTUARY_ROW },
            nCombats: 0,
            nVictories: 0,
            nDefeats: 0,
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            visitedCells: [],
        };
    }

    function createSanctuary(overrides: Partial<IItem>): IItem {
        return {
            itemType: ItemType.FightSanctuary,
            x: SANCTUARY_COLUMN,
            y: SANCTUARY_ROW,
            size: 4,
            active: true,
            ...overrides,
        };
    }
});
/* Merged from game-interaction.service.extra.spec.ts */

(() => {
    describe('GameInteractionService (extra)', () => {
        let service: GameInteractionService;
        let activeGameServiceSpy: jasmine.SpyObj<
            Pick<
                ActiveGameService,
                | 'getCurrentPlayer'
                | 'getPlayersAtPosition'
                | 'toggleDoor'
                | 'actionOnPlayer'
                | 'tryMove'
                | 'isDebugMode'
                | 'getSpawnPointOwnerName'
                | 'debugTeleport'
                | 'interactSanctuary'
            >
        > & {
            actionMode: ActionModeSignalSpy;
            pendingFlagRequest: jasmine.Spy<() => unknown>;
            activeGame: IActiveGame | undefined;
        };
        let popupStateServiceSpy: jasmine.SpyObj<
            Pick<GamePopupStateService, 'closeAllPopups' | 'openSanctuaryPopup' | 'closeSanctuaryPopup' | 'closeTileInfo' | 'openTileInfo'>
        > & {
            isSanctuaryPopupVisible: boolean;
            sanctuaryPopupPosition: { x: number; y: number } | null;
        };
        let localPlayerServiceSpy: jasmine.SpyObj<Pick<LocalPlayerService, 'getLocalPlayer'>>;
        let boardSharedServiceSpy: jasmine.SpyObj<Pick<BoardSharedService, 'getObjectAt'>>;

        let actionModeSpy: ActionModeSignalSpy;
        let localPlayer: ICharacter;

        beforeEach(() => {
            localPlayer = createCharacter('Alice', 5, 5);

            activeGameServiceSpy = jasmine.createSpyObj<
                Pick<
                    ActiveGameService,
                    | 'getCurrentPlayer'
                    | 'getPlayersAtPosition'
                    | 'toggleDoor'
                    | 'actionOnPlayer'
                    | 'tryMove'
                    | 'isDebugMode'
                    | 'getSpawnPointOwnerName'
                    | 'debugTeleport'
                    | 'interactSanctuary'
                >
            >('ActiveGameService', [
                'getCurrentPlayer',
                'getPlayersAtPosition',
                'toggleDoor',
                'actionOnPlayer',
                'tryMove',
                'isDebugMode',
                'getSpawnPointOwnerName',
                'debugTeleport',
                'interactSanctuary',
            ]) as typeof activeGameServiceSpy;

            popupStateServiceSpy = jasmine.createSpyObj<
                Pick<GamePopupStateService, 'closeAllPopups' | 'openSanctuaryPopup' | 'closeSanctuaryPopup' | 'closeTileInfo' | 'openTileInfo'>
            >('GamePopupStateService', [
                'closeAllPopups',
                'openSanctuaryPopup',
                'closeSanctuaryPopup',
                'closeTileInfo',
                'openTileInfo',
            ]) as typeof popupStateServiceSpy;

            localPlayerServiceSpy = jasmine.createSpyObj<Pick<LocalPlayerService, 'getLocalPlayer'>>('LocalPlayerService', ['getLocalPlayer']);
            boardSharedServiceSpy = jasmine.createSpyObj<Pick<BoardSharedService, 'getObjectAt'>>('BoardSharedService', ['getObjectAt']);

            actionModeSpy = jasmine.createSpy<() => boolean>('actionMode').and.returnValue(true) as ActionModeSignalSpy;
            actionModeSpy.set = jasmine.createSpy('actionMode.set');

            activeGameServiceSpy.actionMode = actionModeSpy;
            activeGameServiceSpy.pendingFlagRequest = jasmine.createSpy('pendingFlagRequest').and.returnValue(null);
            activeGameServiceSpy.activeGame = createActiveGame([localPlayer, createCharacter('Bob', 6, 5)]);

            activeGameServiceSpy.getCurrentPlayer.and.returnValue(localPlayer);
            activeGameServiceSpy.getPlayersAtPosition.and.returnValue([]);
            activeGameServiceSpy.isDebugMode.and.returnValue(false);
            activeGameServiceSpy.getSpawnPointOwnerName.and.returnValue(null);
            localPlayerServiceSpy.getLocalPlayer.and.returnValue(localPlayer);
            boardSharedServiceSpy.getObjectAt.and.returnValue(null);

            popupStateServiceSpy.isSanctuaryPopupVisible = false;
            popupStateServiceSpy.sanctuaryPopupPosition = null;

            TestBed.configureTestingModule({
                providers: [
                    { provide: ActiveGameService, useValue: activeGameServiceSpy },
                    { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
                    { provide: BoardSharedService, useValue: boardSharedServiceSpy },
                    { provide: GamePopupStateService, useValue: popupStateServiceSpy },
                ],
            });

            service = TestBed.inject(GameInteractionService);
        });

        it('guards keyboard movement when typing, pending decision, popup open, or wrong turn', () => {
            // Edge case: movement must be blocked while typing in chat.
            const input = document.createElement('input');
            input.setAttribute('data-chat-message-input', 'true');

            service.handleKeyboard({ code: 'KeyW', target: input } as unknown as KeyboardEvent, 10);
            expect(activeGameServiceSpy.tryMove).not.toHaveBeenCalled();

            activeGameServiceSpy.pendingFlagRequest.and.returnValue({});
            service.handleKeyboard({ code: 'KeyW', target: document.body } as unknown as KeyboardEvent, 10);
            expect(activeGameServiceSpy.tryMove).not.toHaveBeenCalled();

            activeGameServiceSpy.pendingFlagRequest.and.returnValue(null);
            popupStateServiceSpy.isSanctuaryPopupVisible = true;
            service.handleKeyboard({ code: 'KeyW', target: document.body } as unknown as KeyboardEvent, 10);
            expect(activeGameServiceSpy.tryMove).not.toHaveBeenCalled();

            popupStateServiceSpy.isSanctuaryPopupVisible = false;
            localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Carol', 1, 1));
            service.handleKeyboard({ code: 'KeyW', target: document.body } as unknown as KeyboardEvent, 10);
            expect(activeGameServiceSpy.tryMove).not.toHaveBeenCalled();

            // Edge case: movement stays blocked when local player is missing.
            localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);
            service.handleKeyboard({ code: 'KeyW', target: document.body } as unknown as KeyboardEvent, 10);
            expect(activeGameServiceSpy.tryMove).not.toHaveBeenCalled();
        });

        it('moves with S, A, and D keys when interaction is allowed', () => {
            // Nominal case: allowed keyboard inputs map to directional movement.
            service.handleKeyboard(new KeyboardEvent('keydown', { code: 'KeyS', key: 's' }), 12);
            expect(popupStateServiceSpy.closeSanctuaryPopup).toHaveBeenCalled();
            expect(activeGameServiceSpy.tryMove).toHaveBeenCalledWith(1, 0, 12);

            activeGameServiceSpy.tryMove.calls.reset();
            service.handleKeyboard(new KeyboardEvent('keydown', { code: 'KeyA', key: 'a' }), 12);
            expect(activeGameServiceSpy.tryMove).toHaveBeenCalledWith(0, -1, 12);

            activeGameServiceSpy.tryMove.calls.reset();
            service.handleKeyboard(new KeyboardEvent('keydown', { code: 'KeyD', key: 'd' }), 12);
            expect(activeGameServiceSpy.tryMove).toHaveBeenCalledWith(0, 1, 12);

            activeGameServiceSpy.tryMove.calls.reset();
            service.handleKeyboard(new KeyboardEvent('keydown', { code: 'KeyQ', key: 'q' }), 12);
            expect(activeGameServiceSpy.tryMove).not.toHaveBeenCalled();
        });

        it('handles grid click guards and door action rules', () => {
            // Edge case: action disabled should prevent door actions.
            actionModeSpy.and.returnValue(false);
            service.handleGridCellClick(2, 2, CellType.Empty, null);
            expect(popupStateServiceSpy.closeAllPopups).toHaveBeenCalled();
            expect(activeGameServiceSpy.toggleDoor).not.toHaveBeenCalled();

            actionModeSpy.and.returnValue(true);
            service.handleGridCellClick(3, 4, CellType.OpenDoor, createItem(ItemType.FightSanctuary, 4, 3, true));
            expect(activeGameServiceSpy.toggleDoor).toHaveBeenCalledWith(3, 4);
            expect(actionModeSpy.set).toHaveBeenCalledWith(false);

            activeGameServiceSpy.toggleDoor.calls.reset();
            actionModeSpy.set.calls.reset();
            service.handleGridCellClick(3, 4, CellType.ClosedDoor, createItem(ItemType.Flag, 4, 3, true));
            expect(activeGameServiceSpy.toggleDoor).not.toHaveBeenCalled();
            expect(actionModeSpy.set).not.toHaveBeenCalled();
        });

        it('opens sanctuary popup only when sanctuary is active and adjacent', () => {
            // Nominal case: adjacent active sanctuary opens the sanctuary popup.
            const sanctuary = createItem(ItemType.FightSanctuary, 6, 5, true);

            service.handleGridCellClick(5, 6, CellType.Empty, sanctuary);
            expect(popupStateServiceSpy.openSanctuaryPopup).toHaveBeenCalledWith(sanctuary, 5, 6);

            popupStateServiceSpy.openSanctuaryPopup.calls.reset();
            service.handleGridCellClick(5, 6, CellType.Empty, createItem(ItemType.FightSanctuary, 6, 5, false));
            expect(popupStateServiceSpy.openSanctuaryPopup).not.toHaveBeenCalled();

            boardSharedServiceSpy.getObjectAt.and.returnValue(createItem(ItemType.FightSanctuary, 6, 5, true));
            service.handleGridCellClick(5, 6, CellType.Empty, null);
            expect(boardSharedServiceSpy.getObjectAt).toHaveBeenCalled();
            expect(popupStateServiceSpy.openSanctuaryPopup).toHaveBeenCalled();

            popupStateServiceSpy.openSanctuaryPopup.calls.reset();
            activeGameServiceSpy.activeGame = undefined;
            service.handleGridCellClick(5, 6, CellType.Empty, null);
            expect(popupStateServiceSpy.openSanctuaryPopup).not.toHaveBeenCalled();
        });

        it('handles player click action with pending and turn guards', () => {
            // Edge case: pending flag decision must block player action click.
            activeGameServiceSpy.pendingFlagRequest.and.returnValue({});
            service.handlePlayerClick('Bob');
            expect(activeGameServiceSpy.actionOnPlayer).not.toHaveBeenCalled();

            activeGameServiceSpy.pendingFlagRequest.and.returnValue(null);
            actionModeSpy.and.returnValue(false);
            service.handlePlayerClick('Bob');
            expect(activeGameServiceSpy.actionOnPlayer).not.toHaveBeenCalled();

            actionModeSpy.and.returnValue(true);
            service.handlePlayerClick('Bob');
            expect(popupStateServiceSpy.closeAllPopups).toHaveBeenCalled();
            expect(activeGameServiceSpy.actionOnPlayer).toHaveBeenCalledWith('Bob');
            expect(actionModeSpy.set).toHaveBeenCalledWith(false);
        });

        it('handles right click debug mode teleport eligibility and info popup', () => {
            // Nominal case: debug mode opens tile info and only teleports when destination is valid.
            const event = createMouseEventSpy();

            activeGameServiceSpy.isDebugMode.and.returnValue(true);
            service.handleCellRightClick(event as unknown as MouseEvent, 1, 1, CellType.Wall, null);

            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopPropagation).toHaveBeenCalled();
            expect(popupStateServiceSpy.closeSanctuaryPopup).toHaveBeenCalled();
            expect(popupStateServiceSpy.openTileInfo).toHaveBeenCalled();
            expect(activeGameServiceSpy.debugTeleport).not.toHaveBeenCalled();

            popupStateServiceSpy.openTileInfo.calls.reset();
            activeGameServiceSpy.debugTeleport.calls.reset();
            popupStateServiceSpy.closeTileInfo.calls.reset();

            boardSharedServiceSpy.getObjectAt.and.returnValue(null);
            activeGameServiceSpy.getPlayersAtPosition.and.returnValue([]);
            service.handleCellRightClick(createMouseEventSpy() as unknown as MouseEvent, 2, 2, CellType.Empty);
            expect(popupStateServiceSpy.closeTileInfo).toHaveBeenCalled();
            expect(activeGameServiceSpy.debugTeleport).toHaveBeenCalledWith(2, 2);
            expect(popupStateServiceSpy.openTileInfo).not.toHaveBeenCalled();

            // Edge case: item on target blocks debug teleport.
            popupStateServiceSpy.openTileInfo.calls.reset();
            activeGameServiceSpy.debugTeleport.calls.reset();
            service.handleCellRightClick(
                createMouseEventSpy() as unknown as MouseEvent,
                2,
                2,
                CellType.Empty,
                createItem(ItemType.FightSanctuary, 2, 2, true),
            );
            expect(popupStateServiceSpy.openTileInfo).toHaveBeenCalled();
            expect(activeGameServiceSpy.debugTeleport).not.toHaveBeenCalled();

            // Edge case: occupied target by another player blocks debug teleport.
            popupStateServiceSpy.openTileInfo.calls.reset();
            activeGameServiceSpy.debugTeleport.calls.reset();
            activeGameServiceSpy.getPlayersAtPosition.and.returnValue([createCharacter('Bob', 2, 2)]);
            service.handleCellRightClick(createMouseEventSpy() as unknown as MouseEvent, 2, 2, CellType.Empty, null);
            expect(popupStateServiceSpy.openTileInfo).toHaveBeenCalled();
            expect(activeGameServiceSpy.debugTeleport).not.toHaveBeenCalled();
        });

        it('handles right click pending guard, door toggle, and non-local fallback info', () => {
            // Edge case: pending flag request should short-circuit right-click handling.
            const event = createMouseEventSpy();
            activeGameServiceSpy.pendingFlagRequest.and.returnValue({});

            service.handleCellRightClick(event as unknown as MouseEvent, 4, 4, CellType.Empty, null);
            expect(event.preventDefault).toHaveBeenCalled();
            expect(event.stopPropagation).toHaveBeenCalled();
            expect(popupStateServiceSpy.closeSanctuaryPopup).not.toHaveBeenCalled();

            activeGameServiceSpy.pendingFlagRequest.and.returnValue(null);
            activeGameServiceSpy.isDebugMode.and.returnValue(false);
            localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Carol', 0, 0));

            service.handleCellRightClick(
                createMouseEventSpy() as unknown as MouseEvent,
                4,
                5,
                CellType.OpenDoor,
                createItem(ItemType.FightSanctuary, 5, 4, true),
            );
            expect(activeGameServiceSpy.toggleDoor).not.toHaveBeenCalled();
            expect(popupStateServiceSpy.openTileInfo).toHaveBeenCalled();

            localPlayerServiceSpy.getLocalPlayer.and.returnValue(localPlayer);
            popupStateServiceSpy.openTileInfo.calls.reset();
            popupStateServiceSpy.closeTileInfo.calls.reset();
            service.handleCellRightClick(
                createMouseEventSpy() as unknown as MouseEvent,
                4,
                5,
                CellType.OpenDoor,
                createItem(ItemType.FightSanctuary, 5, 4, true),
            );
            expect(popupStateServiceSpy.closeTileInfo).toHaveBeenCalled();
            expect(activeGameServiceSpy.toggleDoor).toHaveBeenCalledWith(4, 5);
            expect(actionModeSpy.set).toHaveBeenCalledWith(false);

            // Edge case: occupied door tile should not be toggled.
            popupStateServiceSpy.openTileInfo.calls.reset();
            activeGameServiceSpy.toggleDoor.calls.reset();
            activeGameServiceSpy.getPlayersAtPosition.and.returnValue([createCharacter('Bob', 5, 4)]);
            service.handleCellRightClick(
                createMouseEventSpy() as unknown as MouseEvent,
                4,
                5,
                CellType.OpenDoor,
                createItem(ItemType.FightSanctuary, 5, 4, true),
            );
            expect(activeGameServiceSpy.toggleDoor).not.toHaveBeenCalled();
            expect(popupStateServiceSpy.openTileInfo).toHaveBeenCalled();
        });

        it('handles document clicks and sanctuary choice dispatch', () => {
            // Nominal case: clicks outside grid close popups and sanctuary choice dispatches interaction.
            const grid = document.createElement('div');
            grid.id = 'grid-container';
            const child = document.createElement('span');
            grid.appendChild(child);
            document.body.appendChild(grid);

            service.handleDocumentClick({ target: child } as unknown as MouseEvent);
            expect(popupStateServiceSpy.closeAllPopups).not.toHaveBeenCalled();

            service.handleDocumentClick({ target: {} as EventTarget } as MouseEvent);
            expect(popupStateServiceSpy.closeAllPopups).toHaveBeenCalled();

            popupStateServiceSpy.closeAllPopups.calls.reset();
            service.handleDocumentClick();
            expect(popupStateServiceSpy.closeAllPopups).toHaveBeenCalled();

            popupStateServiceSpy.sanctuaryPopupPosition = null;
            service.handleSanctuaryChoice(SanctuaryChoice.Double);
            expect(activeGameServiceSpy.interactSanctuary).not.toHaveBeenCalled();

            popupStateServiceSpy.sanctuaryPopupPosition = { x: 7, y: 8 };
            service.handleSanctuaryChoice(SanctuaryChoice.Standard);
            expect(popupStateServiceSpy.closeSanctuaryPopup).toHaveBeenCalled();
            expect(activeGameServiceSpy.interactSanctuary).toHaveBeenCalledWith(8, 7, SanctuaryChoice.Standard);
            expect(actionModeSpy.set).toHaveBeenCalledWith(false);

            document.body.removeChild(grid);
        });

        it('evaluates teleport eligibility when private helper uses default item parameter', () => {
            // Nominal case: empty traversable cell with no players remains teleportable.
            activeGameServiceSpy.getPlayersAtPosition.and.returnValue([]);
            boardSharedServiceSpy.getObjectAt.and.returnValue(null);

            const isTeleportable = (
                service as unknown as { isTeleportableCell: (row: number, col: number, cellType: CellType) => boolean }
            ).isTeleportableCell(1, 1, CellType.Empty);

            expect(isTeleportable).toBeTrue();
            expect(boardSharedServiceSpy.getObjectAt).toHaveBeenCalledWith(1, 1, jasmine.any(Array));
        });
    });

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

    function createActiveGame(players: ICharacter[]): IActiveGame {
        const game: IGame = {
            gameTitle: 'Arena',
            description: '',
            gameMode: GameType.Classic,
            dateCreated: new Date('2026-01-01T00:00:00.000Z'),
            lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
            visibility: Visibility.Hidden,
            board: {
                cells: [[CellType.Empty]],
                items: [createItem(ItemType.FightSanctuary, 6, 5, true)],
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

    function createItem(itemType: ItemType, x: number, y: number, active = true): IItem {
        return {
            itemType,
            x,
            y,
            size: itemType === ItemType.FightSanctuary || itemType === ItemType.LifeSanctuary ? 4 : 1,
            active,
        };
    }

    function createMouseEventSpy(): { preventDefault: jasmine.Spy; stopPropagation: jasmine.Spy } {
        return {
            preventDefault: jasmine.createSpy('preventDefault'),
            stopPropagation: jasmine.createSpy('stopPropagation'),
        };
    }
})();
