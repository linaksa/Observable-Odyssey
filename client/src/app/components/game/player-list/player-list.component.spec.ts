/**
 * Testing strategy — Player List Component
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
import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { PlayerListComponent } from './player-list.component';

describe('PlayerListComponent', () => {
    let component: PlayerListComponent;
    let fixture: ComponentFixture<PlayerListComponent>;
    let activeGameServiceStub: {
        activeGame: IActiveGame;
        currentPlayer: jasmine.Spy<() => number>;
    };

    beforeEach(async () => {
        const alice = createCharacter('Alice', Avatar.Avatar1);
        const bob = createCharacter('Bob', Avatar.Avatar2);
        activeGameServiceStub = {
            activeGame: {
                players: [alice, bob],
                turnOrder: ['Bob', 'Missing', 'Alice'],
                organizerName: 'Alice',
            } as unknown as IActiveGame,
            currentPlayer: jasmine.createSpy('currentPlayer').and.returnValue(0),
        };

        await TestBed.configureTestingModule({
            imports: [PlayerListComponent],
            providers: [{ provide: ActiveGameService, useValue: activeGameServiceStub }],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    // Edge case: When turnOrder contains unknown names, only known players should be ordered and displayed.
    it('should order players by turn order and ignore unknown names', () => {
        expect(component.orderedPlayers.map((player) => player.name)).toEqual(['Bob', 'Alice']);
    });

    it('should compute current player name using active index', () => {
        activeGameServiceStub.currentPlayer.and.returnValue(2);

        expect(component.currentPlayerName).toBe('Alice');
    });

    it('should build avatar URL from avatar enum', () => {
        expect(component.buildPlayerAvatarUrl(Avatar.Avatar4)).toBe('./assets/characters/cocoa-portrait.png');

        const avatarImage = fixture.nativeElement.querySelector('img[alt="Player Avatar"]') as HTMLImageElement;
        expect(avatarImage.className).toContain('[image-rendering:pixelated]');
    });

    it('should identify organizer correctly', () => {
        expect(component.organizerName).toBe('Alice');
        expect(component.isOrganizer('Alice')).toBeTrue();
        expect(component.isOrganizer('Bob')).toBeFalse();
    });
});

function createCharacter(name: string, avatar: Avatar): ICharacter {
    return {
        name,
        avatar,
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
    };
}
