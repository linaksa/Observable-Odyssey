/**
 * Testing strategy — activePlayerGuard
 *
 * Approach:
 * - Execute the functional guard in an Angular injection context with mocked router/local-player services.
 * - Assert both the allow path and redirect path by checking the returned boolean/UrlTree values.
 *
 * Edge cases covered:
 * - Missing local player redirects to `/home`.
 * - Existing local player keeps navigation allowed without redirect side effects.
 */
import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { activePlayerGuard } from '@app/guards/active-player.guard';
import { Avatar, DiceType } from '@common/constants';
import { ICharacter } from '@common/character';

describe('activePlayerGuard', () => {
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let redirectTree: UrlTree;

    beforeEach(() => {
        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer']);
        routerSpy = jasmine.createSpyObj<Router>('Router', ['createUrlTree']);
        redirectTree = {} as UrlTree;
        routerSpy.createUrlTree.and.returnValue(redirectTree);

        TestBed.configureTestingModule({
            providers: [
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
                { provide: Router, useValue: routerSpy },
            ],
        });
    });

    it('allows navigation when a local player exists', () => {
        // Nominal case
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createPlayer());

        const result = TestBed.runInInjectionContext(() => activePlayerGuard({} as never, {} as never));

        expect(result).toBeTrue();
        expect(routerSpy.createUrlTree).not.toHaveBeenCalled();
    });

    it('redirects to /home when there is no local player', () => {
        // Edge case
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);

        const result = TestBed.runInInjectionContext(() => activePlayerGuard({} as never, {} as never));

        expect(result).toBe(redirectTree);
        expect(routerSpy.createUrlTree).toHaveBeenCalledWith(['/home']);
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
});
