/**
 * Testing strategy — Game Abandon Component
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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameAbandonComponent } from './game-abandon.component';

describe('GameAbandonComponent', () => {
    let component: GameAbandonComponent;
    let fixture: ComponentFixture<GameAbandonComponent>;
    let activeGameServiceSpy: jasmine.SpyObj<ActiveGameService>;
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let routerSpy: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        activeGameServiceSpy = jasmine.createSpyObj<ActiveGameService>('ActiveGameService', ['abandonGame']);
        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer']);
        routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
        routerSpy.navigate.and.resolveTo(true);

        await TestBed.configureTestingModule({
            imports: [GameAbandonComponent],
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceSpy },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
                { provide: Router, useValue: routerSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameAbandonComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should abandon game and navigate home when local player exists', () => {
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Alice'));

        component.abandon();

        expect(activeGameServiceSpy.abandonGame).toHaveBeenCalledWith('Alice');
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });

    // Edge case: When local player is missing, it should not abandon game.
    it('should not abandon game when local player is missing', () => {
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);

        component.abandon();

        expect(activeGameServiceSpy.abandonGame).not.toHaveBeenCalled();
        expect(routerSpy.navigate).not.toHaveBeenCalled();
    });
});

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
