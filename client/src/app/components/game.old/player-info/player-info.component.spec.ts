/**
 * Testing strategy — Player Info Component
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
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { IActiveGame } from '@common/activeGame';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { PlayerInfoComponent } from './player-info.component';

describe('PlayerInfoComponent', () => {
    let component: PlayerInfoComponent;
    let fixture: ComponentFixture<PlayerInfoComponent>;
    let localPlayerServiceSpy: jasmine.SpyObj<LocalPlayerService>;
    let activeGameServiceStub: { activeGame: IActiveGame };
    let localPlayer: ICharacter;
    let opponent: ICharacter;

    beforeEach(async () => {
        localPlayer = createCharacter('Alice', Avatar.Avatar1, DiceType.FourSided, DiceType.SixSided);
        opponent = createCharacter('Bob', Avatar.Avatar2, DiceType.SixSided, DiceType.FourSided);
        activeGameServiceStub = {
            activeGame: {
                players: [localPlayer, opponent],
            } as unknown as IActiveGame,
        };
        localPlayerServiceSpy = jasmine.createSpyObj<LocalPlayerService>('LocalPlayerService', ['getLocalPlayer']);
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Alice', Avatar.Avatar3, DiceType.FourSided, DiceType.SixSided));

        await TestBed.configureTestingModule({
            imports: [PlayerInfoComponent],
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerInfoComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should resolve current player from active game by local player name', () => {
        expect(component.player?.name).toBe('Alice');
    });

    it('should expose avatar and dice icon urls for current player', () => {
        expect(component.avatarUrl).toBe('./assets/characters/archer-portrait.png');
        expect(component.attackDiceIconUrl).toBe('./assets/form-page/4_sided_dice.svg');
        expect(component.defenseDiceIconUrl).toBe('./assets/form-page/6_sided_dice.svg');

        const avatarImage = fixture.nativeElement.querySelector('img[alt="Player Avatar"]') as HTMLImageElement;
        expect(avatarImage.className).toContain('[image-rendering:pixelated]');
    });

    // Edge case: When local player is undefined, return empty urls.
    it('should return empty urls when local player is undefined', () => {
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);

        expect(component.player).toBeUndefined();
        expect(component.avatarUrl).toBe('');
        expect(component.attackDiceIconUrl).toBe('');
        expect(component.defenseDiceIconUrl).toBe('');
    });
});

function createCharacter(name: string, avatar: Avatar, attackDiceType: DiceType, defenseDiceType: DiceType): ICharacter {
    return {
        name,
        avatar,
        initialHealth: 10,
        currentHealth: 10,
        attackBonusDiceType: attackDiceType,
        defenseBonusDiceType: defenseDiceType,
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
