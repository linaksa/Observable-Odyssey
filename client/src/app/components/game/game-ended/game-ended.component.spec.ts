/**
 * Testing strategy — GameEndedComponent
 *
 * - Show the same end-of-match message as the old game screen.
 * - Keep the no-winner state visible for abandoned matches.
 * - Redirect to the end-game stats page after the shared timeout.
 */
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { IActiveGame } from '@common/activeGame';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType, END_GAME_SCREEN_DURATION_MS } from '@common/constants';
import { GameType, Visibility } from '@common/game';
import { GameEndedComponent } from './game-ended.component';

describe('GameEndedComponent', () => {
    let fixture: ComponentFixture<GameEndedComponent>;
    let routerSpy: jasmine.SpyObj<Router>;
    let activeGameServiceStub: {
        activeGame: IActiveGame;
    };

    beforeEach(async () => {
        routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
        activeGameServiceStub = {
            activeGame: createActiveGame([createCharacter('Alice'), createCharacter('Bob')], 'Alice'),
        };

        await TestBed.configureTestingModule({
            imports: [GameEndedComponent],
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: Router, useValue: routerSpy },
            ],
        }).compileComponents();
    });

    it('should display the winner and redirect to the end-game page', fakeAsync(() => {
        fixture = TestBed.createComponent(GameEndedComponent);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        expect(root.textContent).toContain('Partie terminée');
        expect(root.textContent).toContain('Le gagnant est :');
        expect(root.textContent).toContain('Alice');
        expect(root.textContent).toContain('Redirection automatique vers les statistiques de fin de partie');

        tick(END_GAME_SCREEN_DURATION_MS);

        expect(routerSpy.navigate).toHaveBeenCalledWith(['/end/active-game-id']);
    }));

    it('should display the no-winner message when nobody wins', () => {
        activeGameServiceStub.activeGame.winner = null;

        fixture = TestBed.createComponent(GameEndedComponent);
        fixture.detectChanges();

        const root = fixture.nativeElement as HTMLElement;
        expect(root.textContent).toContain('Pas de gagnant clair. Tous les joueurs ont abandonnés');
    });
});

function createActiveGame(players: ICharacter[], winner: string | null): IActiveGame {
    return {
        _id: 'active-game-id',
        game: {
            gameTitle: 'Arena',
            description: 'Desc',
            gameMode: GameType.Classic,
            visibility: Visibility.Viewable,
            board: {
                cells: [[CellType.Empty]],
                items: [],
            },
            dateCreated: new Date(),
            lastModifiedDate: new Date(),
        },
        players,
        currentPlayerIndex: 0,
        turnOrder: players.map((player) => player.name),
        isFinished: true,
        winner,
        messages: [],
        isDebugMode: false,
        organizerName: 'Alice',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: null,
        turnStartTimeStamp: Date.now(),
        currentAttack: null,
    };
}

function createCharacter(name: string): ICharacter {
    return {
        name,
        avatar: Avatar.Avatar1,
        initialHealth: 10,
        currentHealth: 8,
        attackBonusDiceType: DiceType.FourSided,
        defenseBonusDiceType: DiceType.SixSided,
        rapidityPoints: 4,
        attackPoints: 5,
        defensePoints: 3,
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
    };
}
