/**
 * Testing strategy — Wait Player List Component
 *
 * Approach:
 * - Drive organizer/local-player permutations to validate computed lists and player-management permissions.
 * - Assert avatar rendering helpers and organizer predicates that power waiting-room UI badges and portraits.
 * - Verify action delegation (`kickPlayer`, virtual-player dialog trigger) with strict permission guards.
 *
 * Edge cases covered:
 * - `otherPlayers` excludes the local player while preserving the rest of the lobby order.
 * - Virtual-player creation is blocked for non-organizers, full rooms, or missing active-game data.
 * - Kick actions are ignored when the local user is not the organizer.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { WaitPlayerListComponent } from '@app/components/wait/wait-player-list/wait-player-list.component';

describe('WaitPlayerListComponent', () => {
    let component: WaitPlayerListComponent;
    let fixture: ComponentFixture<WaitPlayerListComponent>;
    let activeGameServiceMock: jasmine.SpyObj<ActiveGameService>;

    const organizer = createCharacter('Organizer');
    const player2 = createCharacter('Player2');

    beforeEach(async () => {
        activeGameServiceMock = jasmine.createSpyObj<ActiveGameService>('ActiveGameService', ['kickPlayer']);
        activeGameServiceMock.activeGame = { maxPlayerCount: 4 } as never;

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

    it('should render portrait avatars with pixelated rendering', () => {
        const avatarImage = fixture.nativeElement.querySelector('img[alt="Organizer"]') as HTMLImageElement;

        expect(avatarImage.getAttribute('src')).toBe('./assets/characters/archer-portrait.png');
        expect(avatarImage.className).toContain('[image-rendering:pixelated]');
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

    it('should allow adding virtual players only when organizer and room is not full', () => {
        // Nominal case: organizer with free slots can add virtual players.
        expect(component.canAddVirtualPlayer).toBeTrue();

        // Edge case: non-organizer cannot add virtual players.
        fixture.componentRef.setInput('localPlayer', player2);
        fixture.detectChanges();
        expect(component.canAddVirtualPlayer).toBeFalse();

        fixture.componentRef.setInput('localPlayer', organizer);
        fixture.componentRef.setInput('players', [organizer, player2, createCharacter('Player3'), createCharacter('Player4')]);
        fixture.detectChanges();
        expect(component.canAddVirtualPlayer).toBeFalse();
    });

    it('should emit open virtual player dialog request and build avatar url', () => {
        const emitSpy = jasmine.createSpy('openVirtualPlayerDialog');
        component.openVirtualPlayerDialog.subscribe(emitSpy);

        component.emitOpenVirtualPlayerDialog();

        expect(emitSpy).toHaveBeenCalled();
        expect(component.buildPlayerAvatarUrl(Avatar.Avatar1)).toContain('-portrait.png');
    });

    it('should disable virtual-player add guard when active game is unavailable', () => {
        // Edge case: undefined active game forces conservative player-management guards.
        activeGameServiceMock.activeGame = undefined as never;

        expect(component.canManagePlayers).toBeTrue();
        expect(component.canAddVirtualPlayer).toBeFalse();
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
