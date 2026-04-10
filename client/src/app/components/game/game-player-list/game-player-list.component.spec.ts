import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { IActiveGame } from '@common/activeGame';
import { ICharacter, Team, VirtualPlayerProfile } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { GamePlayerListComponent } from './game-player-list.component';

describe('GamePlayerListComponent', () => {
    let fixture: ComponentFixture<GamePlayerListComponent>;
    const currentPlayer = signal(0);

    const organizer = createCharacter('Organizer', Avatar.Avatar1);
    const bot = createCharacter('Bot', Avatar.Avatar2, { virtualPlayerProfile: VirtualPlayerProfile.Defensive, hasAbandoned: true });
    const player = createCharacter('Player', Avatar.Avatar3, { team: Team.RED });

    const activeGame: IActiveGame = {
        _id: 'game-id',
        game: {
            gameTitle: 'Test',
            description: 'Description',
            gameMode: GameType.Ctf,
            lastModifiedDate: new Date(),
            dateCreated: new Date(),
            visibility: Visibility.Viewable,
            board: { cells: [], items: [] },
        },
        players: [organizer, bot, player],
        currentPlayerIndex: 0,
        turnOrder: ['Player', 'Organizer', 'Bot'],
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Organizer',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: 'Player',
        turnStartTimeStamp: 0,
        currentAttack: null,
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GamePlayerListComponent],
            providers: [
                {
                    provide: ActiveGameService,
                    useValue: {
                        activeGame,
                        currentPlayer,
                        hasChangedLocation: signal(false),
                        hasAbandonned: signal(false),
                        gameHasEnded: signal(false),
                    } as Partial<ActiveGameService>,
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GamePlayerListComponent);
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(fixture.componentInstance).toBeTruthy();
    });

    it('should render players in turn order and show remaining count', () => {
        const host = fixture.nativeElement as HTMLElement;
        const names = Array.from(host.querySelectorAll('article span.font-semibold')).map((span) => span.textContent?.trim());

        expect(names).toEqual(['Player', 'Organizer', 'Bot']);
        expect(host.textContent).toContain('2 restants / 3');
    });

    it('should highlight the current turn player and abandoned state', () => {
        const host = fixture.nativeElement as HTMLElement;
        const cards = host.querySelectorAll('article');

        expect(cards[0].className).toContain('border-red-500');
        expect(cards[2].className).toContain('opacity-50');
        expect(cards[2].className).toContain('line-through');
    });

    it('should render organizer and virtual player badges with flag icon', () => {
        const host = fixture.nativeElement as HTMLElement;

        expect(host.textContent).toContain('Organisateur');
        expect(host.textContent).toContain('Joueur virtuel');

        const flagIcon = host.querySelector('img[alt="Porteur du drapeau"]') as HTMLImageElement;
        expect(flagIcon.getAttribute('src')).toContain('/assets/objects/flag.png');
    });

    it('should render player avatar portraits with optimized image source', () => {
        const host = fixture.nativeElement as HTMLElement;
        const avatar = host.querySelector('img[alt="Avatar de Organizer"]') as HTMLImageElement;

        expect(avatar.getAttribute('src')).toContain('/assets/characters/archer-portrait.png');
    });
});

function createCharacter(name: string, avatar: Avatar, overrides: Partial<ICharacter> = {}): ICharacter {
    return {
        name,
        avatar,
        initialHealth: 10,
        currentHealth: 10,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints: 4,
        attackPoints: 5,
        defensePoints: 5,
        actionsLeft: 1,
        movementLeft: 4,
        victories: 2,
        hasAbandoned: false,
        startingPosition: { x: 0, y: 0 },
        currentPosition: { x: 0, y: 0 },
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
        ...overrides,
    };
}
