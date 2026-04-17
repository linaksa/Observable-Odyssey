/**
 * Testing strategy — waitPageGuard
 *
 * Approach:
 * - Execute the functional guard with mocked route snapshots and service dependencies.
 * - Validate both synchronous redirect branches and asynchronous game-state checks returned as observables.
 *
 * Edge cases covered:
 * - Missing local player or missing `activeGameId` route param redirects to `/home`.
 * - Fetch failures and already-started games redirect away from the waiting page.
 */
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, convertToParamMap, Router, UrlTree } from '@angular/router';
import { GameService } from '@app/services/admin/game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { waitPageGuard } from '@app/guards/wait-page.guard';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';

describe('waitPageGuard', () => {
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let homeTree: UrlTree;
    let gameTree: UrlTree;

    beforeEach(() => {
        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer']);
        gameServiceSpy = jasmine.createSpyObj<GameService>('GameService', ['getActiveGameById']);
        routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
        homeTree = { marker: 'home' } as unknown as UrlTree;
        gameTree = { marker: 'game' } as unknown as UrlTree;
        routerSpy.createUrlTree.and.callFake((commands: readonly string[]) => {
            return commands.length > 1 ? gameTree : homeTree;
        });

        TestBed.configureTestingModule({
            providers: [
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
                { provide: GameService, useValue: gameServiceSpy },
                { provide: Router, useValue: routerSpy },
            ],
        });
    });

    it('redirects to /home when local player is missing', () => {
        // Edge case
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);

        const result = TestBed.runInInjectionContext(() => waitPageGuard(makeRoute('game-1'), {} as never));

        expect(result).toBe(homeTree);
        expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/home']);
        expect(gameServiceSpy.getActiveGameById).not.toHaveBeenCalled();
    });

    it('redirects to /home when activeGameId route param is missing', () => {
        // Edge case
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createPlayer('Alice'));

        const result = TestBed.runInInjectionContext(() => waitPageGuard(makeRoute(null), {} as never));

        expect(result).toBe(homeTree);
        expect(gameServiceSpy.getActiveGameById).not.toHaveBeenCalled();
    });

    it('redirects to gameplay page when the game already started', async () => {
        // Nominal case
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createPlayer('Alice'));
        gameServiceSpy.getActiveGameById.and.returnValue(of(createActiveGame('game-1', ['Alice'])));

        const result = TestBed.runInInjectionContext(() => waitPageGuard(makeRoute('game-1'), {} as never));
        const resolved = await resolveGuardResult(result);

        expect(resolved).toBe(gameTree);
        expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/home', 'game-1']);
    });

    it('allows waiting page access when game has not started', async () => {
        // Nominal case
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createPlayer('Alice'));
        gameServiceSpy.getActiveGameById.and.returnValue(of(createActiveGame('game-1', [])));

        const result = TestBed.runInInjectionContext(() => waitPageGuard(makeRoute('game-1'), {} as never));
        const resolved = await resolveGuardResult(result);

        expect(resolved).toBeTrue();
    });

    it('redirects to /home when active game request fails', async () => {
        // Edge case
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createPlayer('Alice'));
        gameServiceSpy.getActiveGameById.and.returnValue(throwError(() => new Error('boom')));

        const result = TestBed.runInInjectionContext(() => waitPageGuard(makeRoute('game-1'), {} as never));
        const resolved = await resolveGuardResult(result);

        expect(resolved).toBe(homeTree);
        expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/home']);
    });

    function makeRoute(activeGameId: string | null): ActivatedRouteSnapshot {
        return {
            paramMap: convertToParamMap(activeGameId ? { activeGameId } : {}),
        } as ActivatedRouteSnapshot;
    }

    async function resolveGuardResult(result: ReturnType<typeof waitPageGuard>): Promise<unknown> {
        return isObservable(result) ? firstValueFrom(result) : Promise.resolve(result);
    }

    function createPlayer(name: string): ICharacter {
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
        };
    }

    function createActiveGame(id: string, turnOrder: string[]): IActiveGame {
        const player = createPlayer('Alice');
        return {
            _id: id,
            game: {
                gameTitle: 'Game',
                description: 'Desc',
                gameMode: GameType.Classic,
                lastModifiedDate: new Date(),
                dateCreated: new Date(),
                visibility: Visibility.Viewable,
                board: {
                    cells: [[CellType.Empty]],
                    items: [],
                },
            },
            players: [player],
            currentPlayerIndex: 0,
            turnOrder,
            isFinished: false,
            winner: null,
            messages: [],
            isDebugMode: false,
            organizerName: 'Alice',
            maxPlayerCount: 2,
            turnIsInPreparation: false,
            hasFlagId: null,
            turnStartTimeStamp: Date.now(),
            currentAttack: null,
        };
    }
});
/* Merged from wait-page.guard.extra.spec.ts */

(() => {
    describe('waitPageGuard (extra)', () => {
        let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
        let gameServiceSpy: jasmine.SpyObj<GameService>;
        let routerSpy: jasmine.SpyObj<Router>;

        beforeEach(() => {
            localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer']);
            gameServiceSpy = jasmine.createSpyObj<GameService>('GameService', ['getActiveGameById']);
            routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
            routerSpy.createUrlTree.and.returnValue({ marker: 'home' } as unknown as UrlTree);

            TestBed.configureTestingModule({
                providers: [
                    { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
                    { provide: GameService, useValue: gameServiceSpy },
                    { provide: Router, useValue: routerSpy },
                ],
            });
        });

        it('allows access when turnOrder is undefined thanks to nullish fallback', async () => {
            localPlayerServiceSpy.getLocalPlayer.and.returnValue(createPlayer('Alice'));
            gameServiceSpy.getActiveGameById.and.returnValue(of(createActiveGameWithoutTurnOrder('game-1')));

            const result = TestBed.runInInjectionContext(() => waitPageGuard(makeRoute('game-1'), {} as never));
            const resolved = await resolveGuardResult(result);

            expect(resolved).toBeTrue();
        });
    });

    function makeRoute(activeGameId: string): ActivatedRouteSnapshot {
        return {
            paramMap: convertToParamMap({ activeGameId }),
        } as ActivatedRouteSnapshot;
    }

    async function resolveGuardResult(result: ReturnType<typeof waitPageGuard>): Promise<unknown> {
        return isObservable(result) ? firstValueFrom(result) : Promise.resolve(result);
    }

    function createPlayer(name: string): ICharacter {
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
        };
    }

    function createActiveGameWithoutTurnOrder(id: string): IActiveGame {
        const activeGame: IActiveGame = {
            _id: id,
            game: {
                gameTitle: 'Game',
                description: 'Desc',
                gameMode: GameType.Classic,
                lastModifiedDate: new Date(),
                dateCreated: new Date(),
                visibility: Visibility.Viewable,
                board: {
                    cells: [[CellType.Empty]],
                    items: [],
                },
            },
            players: [createPlayer('Alice')],
            currentPlayerIndex: 0,
            turnOrder: [],
            isFinished: false,
            winner: null,
            messages: [],
            isDebugMode: false,
            organizerName: 'Alice',
            maxPlayerCount: 2,
            turnIsInPreparation: false,
            hasFlagId: null,
            turnStartTimeStamp: Date.now(),
            currentAttack: null,
        };

        return {
            ...activeGame,
            turnOrder: undefined as unknown as string[],
        };
    }
})();
