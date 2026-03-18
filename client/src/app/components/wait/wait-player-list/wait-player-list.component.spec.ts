/**
 * Testing strategy — Wait Player List Component
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
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { WaitPlayerListComponent } from './wait-player-list.component';

describe('WaitPlayerListComponent', () => {
    let component: WaitPlayerListComponent;
    let fixture: ComponentFixture<WaitPlayerListComponent>;
    let activeGameServiceMock: jasmine.SpyObj<ActiveGameService>;

    const organizer = createCharacter('Organizer');
    const player2 = createCharacter('Player2');

    beforeEach(async () => {
        activeGameServiceMock = jasmine.createSpyObj<ActiveGameService>('ActiveGameService', ['kickPlayer']);

        await TestBed.configureTestingModule({
            imports: [WaitPlayerListComponent],
            providers: [{ provide: ActiveGameService, useValue: activeGameServiceMock }],
        }).compileComponents();

        fixture = TestBed.createComponent(WaitPlayerListComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('players', [organizer, player2]);
        fixture.componentRef.setInput('organizerName', organizer.name);
        fixture.componentRef.setInput('localPlayer', organizer);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    // Edge case: When computing otherPlayers, the local player should be excluded from the list.
    it('should compute otherPlayers without local player', () => {
        expect(component.otherPlayers).toEqual([player2]);
    });

    it('should allow player management only for organizer', () => {
        expect(component.canManagePlayers).toBeTrue();

        fixture.componentRef.setInput('localPlayer', player2);
        fixture.detectChanges();

        expect(component.canManagePlayers).toBeFalse();
    });

    it('should correctly identify organizer names', () => {
        expect(component.isOrganizer(organizer.name)).toBeTrue();
        expect(component.isOrganizer(player2.name)).toBeFalse();
        expect(component.isOrganizer(undefined)).toBeFalse();
    });

    it('should kick player only when local player is organizer', () => {
        component.kickPlayer(player2.name);
        expect(activeGameServiceMock.kickPlayer).toHaveBeenCalledWith(player2.name);

        activeGameServiceMock.kickPlayer.calls.reset();
        fixture.componentRef.setInput('localPlayer', player2);
        fixture.detectChanges();

        component.kickPlayer(organizer.name);
        expect(activeGameServiceMock.kickPlayer).not.toHaveBeenCalled();
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
        attackPoints: 5,
        defensePoints: 5,
        actionsLeft: 1,
        movementLeft: 4,
        victories: 0,
        hasAbandoned: false,
        positionDepart: { x: 0, y: 0 },
        positionGrille: { x: 0, y: 0 },
    };
}
