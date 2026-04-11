/**
 * Testing strategy — Game interaction service
 *
 * - Verify right-click inspection opens tile info without object details.
 * - Verify debug teleport keeps the tooltip closed on valid teleport tiles.
 */
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GamePopupStateService } from '@app/services/gameplay/game-popup-state.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { BoardSharedService } from '@app/services/shared/board-shared.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { Avatar, DiceType } from '@common/constants';
import { ICharacter } from '@common/character';
import { GameType, Visibility } from '@common/game';
import { ItemType, SMALL_ITEM_SIZE } from '@common/items';
import { GameInteractionService } from './game-interaction.service';

describe('GameInteractionService', () => {
    let service: GameInteractionService;
    let activeGameServiceStub: {
        activeGame: IActiveGame;
        isDebugMode: ReturnType<typeof signal<boolean>>;
        getCurrentPlayer: jasmine.Spy<() => ICharacter | undefined>;
        getPlayersAtPosition: jasmine.Spy<(rowIndex: number, colIndex: number) => ICharacter[]>;
        debugTeleport: jasmine.Spy<(rowIndex: number, colIndex: number) => void>;
        toggleDoor: jasmine.Spy<(rowIndex: number, colIndex: number) => void>;
        actionMode: ReturnType<typeof signal<boolean>>;
    };
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let popupStateServiceSpy: jasmine.SpyObj<GamePopupStateService>;
    let boardSharedServiceSpy: jasmine.SpyObj<BoardSharedService>;

    beforeEach(() => {
        const localPlayer = createCharacter('Alice');

        activeGameServiceStub = {
            activeGame: createActiveGame(),
            isDebugMode: signal(false),
            getCurrentPlayer: jasmine.createSpy('getCurrentPlayer').and.returnValue(localPlayer),
            getPlayersAtPosition: jasmine.createSpy('getPlayersAtPosition').and.returnValue([]),
            debugTeleport: jasmine.createSpy('debugTeleport'),
            toggleDoor: jasmine.createSpy('toggleDoor'),
            actionMode: signal(false),
        };
        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer']);
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(localPlayer);
        popupStateServiceSpy = jasmine.createSpyObj<GamePopupStateService>('GamePopupStateService', [
            'openTileInfo',
            'closeTileInfo',
            'closeSanctuaryPopup',
            'closeAllPopups',
        ]);
        boardSharedServiceSpy = jasmine.createSpyObj<BoardSharedService>('BoardSharedService', ['getObjectAt']);

        boardSharedServiceSpy.getObjectAt.and.returnValue({
            itemType: ItemType.Flag,
            x: 0,
            y: 0,
            size: SMALL_ITEM_SIZE,
        });

        TestBed.configureTestingModule({
            providers: [
                GameInteractionService,
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
                { provide: GamePopupStateService, useValue: popupStateServiceSpy },
                { provide: BoardSharedService, useValue: boardSharedServiceSpy },
            ],
        });

        service = TestBed.inject(GameInteractionService);
    });

    it('opens tile info without object details on right click', () => {
        const event = new MouseEvent('contextmenu');

        service.handleCellRightClick(event, 1, 1, CellType.Empty);

        expect(popupStateServiceSpy.closeSanctuaryPopup).toHaveBeenCalled();
        expect(popupStateServiceSpy.openTileInfo).toHaveBeenCalledWith(CellType.Empty, null, null);
        expect(activeGameServiceStub.debugTeleport).not.toHaveBeenCalled();
    });

    it('keeps the tooltip closed when debug teleporting a valid tile', () => {
        activeGameServiceStub.isDebugMode.set(true);
        boardSharedServiceSpy.getObjectAt.and.returnValue(null);

        const event = new MouseEvent('contextmenu');

        service.handleCellRightClick(event, 1, 1, CellType.Empty);

        expect(popupStateServiceSpy.closeTileInfo).toHaveBeenCalled();
        expect(popupStateServiceSpy.openTileInfo).not.toHaveBeenCalled();
        expect(activeGameServiceStub.debugTeleport).toHaveBeenCalledWith(1, 1);
    });
});

function createCharacter(name: string): ICharacter {
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
        startingPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}

function createActiveGame(): IActiveGame {
    return {
        _id: 'active-game-id',
        game: {
            gameTitle: 'Arena',
            description: 'Desc',
            gameMode: GameType.Classic,
            visibility: Visibility.Viewable,
            board: {
                cells: [[CellType.Empty]],
                items: [],
            },
            dateCreated: new Date(),
            lastModifiedDate: new Date(),
        },
        players: [],
        currentPlayerIndex: 0,
        turnOrder: [],
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
