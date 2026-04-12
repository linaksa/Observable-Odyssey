/**
 * Testing strategy — Game Interaction Service
 *
 * Approach:
 * - Keep tests focused on sanctuary click behavior.
 * - Verify used sanctuaries never open the popup again.
 * - Verify still-active sanctuaries keep opening normally.
 */
import { TestBed } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GamePopupStateService } from '@app/services/gameplay/game-popup-state.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { SanctuaryChoice } from '@common/info';
import { IItem, ItemType } from '@common/items';
import { SocketEvent } from '@common/socket-events';
import { GameInteractionService } from './game-interaction.service';

type ActionModeSignalSpy = jasmine.Spy<() => boolean> & { set: jasmine.Spy };
type ActiveGameServiceSpy = jasmine.SpyObj<
    Pick<ActiveGameService, 'getCurrentPlayer' | 'getPlayersAtPosition' | 'interactSanctuary' | 'pendingFlagRequest'>
> & {
    actionMode: ActionModeSignalSpy;
};
type GamePopupStateServiceSpy = jasmine.SpyObj<Pick<GamePopupStateService, 'closeAllPopups' | 'openSanctuaryPopup' | 'closeSanctuaryPopup'>> & {
    sanctuaryPopupPosition: { x: number; y: number } | null;
};

describe('GameInteractionService', () => {
    const SANCTUARY_ROW = 5;
    const SANCTUARY_COLUMN = 6;

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
            Pick<ActiveGameService, 'getCurrentPlayer' | 'getPlayersAtPosition' | 'interactSanctuary' | 'pendingFlagRequest'>
        >('ActiveGameService', ['getCurrentPlayer', 'getPlayersAtPosition', 'interactSanctuary', 'pendingFlagRequest']) as ActiveGameServiceSpy;
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
        const usedSanctuary = createSanctuary({ active: false, inactiveTurnsRemaining: 0 });

        service.handleGridCellClick(SANCTUARY_ROW, SANCTUARY_COLUMN, CellType.Empty, usedSanctuary);

        expect(popupStateServiceSpy.openSanctuaryPopup).not.toHaveBeenCalled();
    });

    it('should still open the sanctuary popup for an available sanctuary', () => {
        const availableSanctuary = createSanctuary({ active: true, inactiveTurnsRemaining: 0 });

        service.handleGridCellClick(SANCTUARY_ROW, SANCTUARY_COLUMN, CellType.Empty, availableSanctuary);

        expect(popupStateServiceSpy.openSanctuaryPopup).toHaveBeenCalled();
    });

    it('should still open sanctuary popup when stale client state keeps a cooldown counter on an active sanctuary', () => {
        const staleSanctuary = createSanctuary({ active: true, inactiveTurnsRemaining: 1 });

        service.handleGridCellClick(SANCTUARY_ROW, SANCTUARY_COLUMN, CellType.Empty, staleSanctuary);

        expect(popupStateServiceSpy.openSanctuaryPopup).toHaveBeenCalled();
    });

    it('should emit sanctuary interaction when the player selects a choice', () => {
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
        const reactivatedSanctuary = createSanctuary({
            active: true,
            inactiveTurnsRemaining: undefined,
        });

        service.handleGridCellClick(SANCTUARY_ROW, SANCTUARY_COLUMN, CellType.Empty, reactivatedSanctuary);

        expect(popupStateServiceSpy.openSanctuaryPopup).toHaveBeenCalled();
    });

    it('should block grid interactions while a flag transfer decision is pending', () => {
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
