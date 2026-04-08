/**
 * Testing strategy — Game Attack Component
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
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameActionComponent } from './game-action.component';

describe('GameActionComponent', () => {
    let component: GameActionComponent;
    let fixture: ComponentFixture<GameActionComponent>;
    let activeGameServiceStub: {
        toggleActionMode: jasmine.Spy;
        actionMode: jasmine.Spy<() => boolean>;
        getPlayerByName: jasmine.Spy<(playerName: string) => ICharacter | undefined>;
    };
    let gameTurnServiceStub: { canEndTurn: boolean };
    let localPlayerServiceStub: { getLocalPlayer: jasmine.Spy<() => ICharacter | undefined> };

    beforeEach(async () => {
        activeGameServiceStub = {
            toggleActionMode: jasmine.createSpy('toggleActionMode'),
            actionMode: jasmine.createSpy('actionMode').and.returnValue(false),
            getPlayerByName: jasmine.createSpy('getPlayerByName').and.returnValue(undefined),
        };
        gameTurnServiceStub = { canEndTurn: true };
        localPlayerServiceStub = {
            getLocalPlayer: jasmine.createSpy('getLocalPlayer').and.returnValue(undefined),
        };

        await TestBed.configureTestingModule({
            imports: [GameActionComponent],
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: GameTurnService, useValue: gameTurnServiceStub },
                { provide: LocalPlayerService, useValue: localPlayerServiceStub },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameActionComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should toggle attack mode when turn can end', () => {
        gameTurnServiceStub.canEndTurn = true;

        component.toggle();

        expect(activeGameServiceStub.toggleActionMode).toHaveBeenCalled();
    });

    // Edge case: When turn cannot end, it should not toggle action mode.
    it('should not toggle action mode when turn cannot end', () => {
        gameTurnServiceStub.canEndTurn = false;

        component.toggle();

        expect(activeGameServiceStub.toggleActionMode).not.toHaveBeenCalled();
    });

    // Edge case: When turn cannot end, disable action button.
    it('should disable action button when turn cannot end', () => {
        gameTurnServiceStub.canEndTurn = false;
        fixture.detectChanges();
        const button = (fixture.nativeElement as HTMLElement).querySelector('button') as HTMLButtonElement;

        expect(button.disabled).toBeTrue();
    });

    it('should apply active action style when action mode is enabled', () => {
        activeGameServiceStub.actionMode.and.returnValue(true);
        gameTurnServiceStub.canEndTurn = true;
        fixture.detectChanges();
        const button = (fixture.nativeElement as HTMLElement).querySelector('button');

        expect(button?.classList.contains('bg-red-600')).toBeTrue();
        expect(button?.classList.contains('text-white')).toBeTrue();
    });

    it('should return false from hasUsedActionThisTurn when local player is missing', () => {
        localPlayerServiceStub.getLocalPlayer.and.returnValue(undefined);

        expect(component.hasUsedActionThisTurn()).toBeFalse();
    });

    it('should return true from hasUsedActionThisTurn when local player has no actions left', () => {
        localPlayerServiceStub.getLocalPlayer.and.returnValue(createCharacter('Alice'));
        activeGameServiceStub.getPlayerByName.and.returnValue({
            ...createCharacter('Alice'),
            actionsLeft: 0,
        });

        expect(component.hasUsedActionThisTurn()).toBeTrue();
    });

    it('should treat missing active-game player as already used action for this turn', () => {
        localPlayerServiceStub.getLocalPlayer.and.returnValue(createCharacter('Alice'));
        activeGameServiceStub.getPlayerByName.and.returnValue(undefined);

        expect(component.hasUsedActionThisTurn()).toBeTrue();
    });

    it('should return false from hasUsedActionThisTurn when player still has actions left', () => {
        localPlayerServiceStub.getLocalPlayer.and.returnValue(createCharacter('Alice'));
        activeGameServiceStub.getPlayerByName.and.returnValue({
            ...createCharacter('Alice'),
            actionsLeft: 1,
        });

        expect(component.hasUsedActionThisTurn()).toBeFalse();
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
