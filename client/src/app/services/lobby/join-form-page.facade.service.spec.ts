/**
 * Testing strategy — JoinFormPageFacadeService
 *
 * Approach:
 * - Mock gameplay/table/socket collaborators and verify facade orchestration for connect, fetch, and join flows.
 * - Assert local-player persistence, navigation triggers, and toast/error mapping on join outcomes.
 *
 * Edge cases covered:
 * - Avatar availability excludes abandoned players when refreshing choices.
 * - Missing active game id and failed joins surface dedicated fallback toasts.
 */
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { JoinFormPageFacadeService } from '@app/services/lobby/join-form-page.facade.service';
import { CharacterFormService } from '@app/services/forms/character-form.service';
import { SocketService } from '@app/services/realtime/socket.service';
import { GameService } from '@app/services/admin/game.service';
import { ToastService } from '@app/services/ui/toast.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { CharacterFormData, ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { IActiveGame, IActiveGameWithPlayer } from '@common/active-game';
import { Namespaces } from '@common/namespaces';
import { SocketEvent } from '@common/socket-events';
import { ErrorCode } from '@common/error-codes';
import { CellType } from '@common/board';
import { Observable, Subject, of, throwError } from 'rxjs';

describe('JoinFormPageFacadeService', () => {
    let service: JoinFormPageFacadeService;
    let characterFormServiceStub: {
        unavailableAvatars: ReturnType<typeof signal<Avatar[]>>;
        isLoading: ReturnType<typeof signal<boolean>>;
        errors: ReturnType<typeof signal<string | null>>;
        joinActiveGameWithCharacter: jasmine.Spy;
    };
    let socketServiceSpy: jasmine.SpyObj<SocketService>;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let toastServiceSpy: jasmine.SpyObj<ToastService>;
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let joinableGamesUpdates$: Subject<string>;

    beforeEach(() => {
        characterFormServiceStub = {
            unavailableAvatars: signal<Avatar[]>([]),
            isLoading: signal(false),
            errors: signal<string | null>(null),
            joinActiveGameWithCharacter: jasmine.createSpy('joinActiveGameWithCharacter'),
        };
        socketServiceSpy = jasmine.createSpyObj<SocketService>('SocketService', ['connect', 'disconnect', 'on']);
        gameServiceSpy = jasmine.createSpyObj<GameService>('GameService', ['getActiveGameById']);
        toastServiceSpy = jasmine.createSpyObj<ToastService>('ToastService', ['show']);
        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['setLocalPlayer']);
        routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
        routerSpy.navigate.and.resolveTo(true);

        joinableGamesUpdates$ = new Subject<string>();
        socketServiceSpy.on.and.returnValue(joinableGamesUpdates$ as unknown as Observable<string>);

        TestBed.configureTestingModule({
            providers: [
                JoinFormPageFacadeService,
                { provide: CharacterFormService, useValue: characterFormServiceStub },
                { provide: SocketService, useValue: socketServiceSpy },
                { provide: GameService, useValue: gameServiceSpy },
                { provide: ToastService, useValue: toastServiceSpy },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
                { provide: Router, useValue: routerSpy },
            ],
        });

        service = TestBed.inject(JoinFormPageFacadeService);
    });

    it('connects/disconnects and exposes joinable games update stream', () => {
        // Nominal case
        const stream = service.onJoinableGamesUpdated();

        service.connectToJoinableGamesUpdates();
        service.disconnectFromJoinableGamesUpdates();

        expect(stream).toBe(joinableGamesUpdates$ as unknown as Observable<string>);
        expect(socketServiceSpy.connect).toHaveBeenCalledWith(Namespaces.ActiveGameAdmin);
        expect(socketServiceSpy.disconnect).toHaveBeenCalledWith(Namespaces.ActiveGameAdmin);
        expect(socketServiceSpy.on).toHaveBeenCalledWith(Namespaces.ActiveGameAdmin, SocketEvent.JoinableGamesUpdated);
    });

    it('resolves route activeGameId and refresh condition correctly', () => {
        // Nominal case
        expect(service.resolveActiveGameId({ activeGameId: 'g-1' })).toBe('g-1');
        expect(service.resolveActiveGameId({})).toBeNull();

        expect(service.shouldRefreshAvatars('g-1', 'g-1')).toBeTrue();
        expect(service.shouldRefreshAvatars('g-2', 'g-1')).toBeFalse();
        expect(service.shouldRefreshAvatars('g-1', null)).toBeFalse();
    });

    it('fetches unavailable avatars excluding abandoned players', () => {
        // Nominal case
        const activeGame = createActiveGame([
            createPlayer('Alice', Avatar.Avatar1, false),
            createPlayer('Bob', Avatar.Avatar2, true),
            createPlayer('Carol', Avatar.Avatar3, false),
        ]);
        gameServiceSpy.getActiveGameById.and.returnValue(of(activeGame));

        service.fetchUnavailableAvatars('game-1');

        expect(characterFormServiceStub.unavailableAvatars()).toEqual([Avatar.Avatar1, Avatar.Avatar3]);
    });

    it('joins game and stores local player on success', () => {
        // Nominal case
        const characterData = createCharacterFormData();
        const response = createJoinResponse('game-1', characterData);
        characterFormServiceStub.joinActiveGameWithCharacter.and.returnValue(of(response));

        service.joinGameAsCharacter('game-1', characterData);

        expect(characterFormServiceStub.isLoading()).toBeFalse();
        expect(characterFormServiceStub.errors()).toBeNull();
        expect(localPlayerServiceSpy.setLocalPlayer).toHaveBeenCalledWith(response.player);
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/wait', 'game-1']);
    });

    it('shows fallback and maps errors when join fails', () => {
        // Edge case
        const characterData = createCharacterFormData();
        characterFormServiceStub.joinActiveGameWithCharacter.and.returnValue(throwError(() => ({ errorCodes: [ErrorCode.ActiveGameFull] })));

        service.joinGameAsCharacter('game-1', characterData);

        expect(characterFormServiceStub.isLoading()).toBeFalse();
        expect(toastServiceSpy.show).toHaveBeenCalledWith('Erreur, veuillez quitter ou réessayer plus tard');
        expect(characterFormServiceStub.errors()).toContain('Nombre maximum de joueurs atteint');
    });

    it('shows a dedicated toast when active game id is missing', () => {
        // Edge case
        service.showMissingGameIdError();

        expect(toastServiceSpy.show).toHaveBeenCalledWith("L'ID de la partie à rejoindre est manquant.");
    });

    function createCharacterFormData(): CharacterFormData {
        return {
            name: 'Alice',
            avatar: Avatar.Avatar1,
            initialHealth: 10,
            rapidityPoints: 6,
            attackPoints: 4,
            defensePoints: 4,
            attackBonusDiceType: DiceType.FourSided,
            defenseBonusDiceType: DiceType.SixSided,
        };
    }

    function createPlayer(name: string, avatar: Avatar, hasAbandoned: boolean): ICharacter {
        return {
            ...createJoinResponse('game-1', createCharacterFormData()).player,
            name,
            avatar,
            hasAbandoned,
        };
    }

    function createJoinResponse(activeGameId: string, data: CharacterFormData): IActiveGameWithPlayer {
        return {
            activeGame: createActiveGame(
                [
                    {
                        name: data.name,
                        avatar: data.avatar,
                        initialHealth: data.initialHealth,
                        currentHealth: data.initialHealth,
                        attackBonusDiceType: data.attackBonusDiceType,
                        defenseBonusDiceType: data.defenseBonusDiceType,
                        rapidityPoints: data.rapidityPoints,
                        attackPoints: data.attackPoints,
                        defensePoints: data.defensePoints,
                        actionsLeft: 1,
                        movementLeft: 3,
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
                    },
                ],
                activeGameId,
            ),
            player: {
                name: data.name,
                avatar: data.avatar,
                initialHealth: data.initialHealth,
                currentHealth: data.initialHealth,
                attackBonusDiceType: data.attackBonusDiceType,
                defenseBonusDiceType: data.defenseBonusDiceType,
                rapidityPoints: data.rapidityPoints,
                attackPoints: data.attackPoints,
                defensePoints: data.defensePoints,
                actionsLeft: 1,
                movementLeft: 3,
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
            },
        };
    }

    function createActiveGame(players: ICharacter[], id = 'game-1'): IActiveGame {
        return {
            _id: id,
            game: {
                gameTitle: 'Game',
                description: 'Desc',
                gameMode: GameType.Classic,
                lastModifiedDate: new Date(),
                dateCreated: new Date(),
                visibility: Visibility.Viewable,
                board: { cells: [[CellType.Empty]], items: [] },
            },
            players,
            currentPlayerIndex: 0,
            turnOrder: players.map((player) => player.name),
            isFinished: false,
            winner: null,
            messages: [],
            isDebugMode: false,
            organizerName: players[0]?.name ?? 'Alice',
            maxPlayerCount: 4,
            turnIsInPreparation: false,
            hasFlagId: null,
            turnStartTimeStamp: Date.now(),
            currentAttack: null,
        };
    }
});
