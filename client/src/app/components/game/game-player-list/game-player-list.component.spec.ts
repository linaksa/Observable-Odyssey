/**
 * Testing strategy — Game Player List Component
 *
 * Approach:
 * - Validate player-list computed values directly from ActiveGame signals without template coupling.
 * - Cover ordering, turn indicators, organizer/flag helpers, and team-color rendering through deterministic fixtures.
 *
 * Edge cases covered:
 * - Missing active game or absent turn-order entries should yield safe empty/default labels.
 * - Abandoned players and undefined teams should still produce stable counts and fallback colors.
 */
import { Component, signal } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { BLUE_TEAM_PLAYER_NAME_COLOR, DEFAULT_PLAYER_NAME_COLOR, RED_TEAM_PLAYER_NAME_COLOR } from '@app/constants/player-info';
import { GamePlayerListComponent } from '@app/components/game/game-player-list/game-player-list.component';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter, Team } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';

describe('GamePlayerListComponent', () => {
    let fixture: ComponentFixture<GamePlayerListComponent>;
    let component: GamePlayerListComponent;

    let activeGameServiceStub: {
        hasChangedLocation: ReturnType<typeof signal<boolean>>;
        hasAbandoned: ReturnType<typeof signal<boolean>>;
        gameHasEnded: ReturnType<typeof signal<boolean>>;
        currentPlayer: ReturnType<typeof signal<number>>;
        activeGame: IActiveGame | undefined;
    };

    beforeEach(async () => {
        const alice = createCharacter('Alice', Team.RED, { victories: 2 });
        const bob = createCharacter('Bob', Team.BLUE, { hasAbandoned: true });
        const carol = createCharacter('Carol', null);

        activeGameServiceStub = {
            hasChangedLocation: signal(false),
            hasAbandoned: signal(false),
            gameHasEnded: signal(false),
            currentPlayer: signal(1),
            activeGame: createActiveGame([alice, bob, carol]),
        };

        const overrideInfo: MetadataOverride<Component> = {
            set: {
                template: '',
                imports: [],
            },
        };
        TestBed.overrideComponent(GamePlayerListComponent, overrideInfo);

        await TestBed.configureTestingModule({
            imports: [GamePlayerListComponent],
            providers: [{ provide: ActiveGameService, useValue: activeGameServiceStub }],
        }).compileComponents();

        fixture = TestBed.createComponent(GamePlayerListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('orders players by turn order and derives turn/count labels', () => {
        // Nominal case: populated turn order drives player ordering and remaining-count labels.
        const list = component as unknown as {
            orderedPlayers: () => ICharacter[];
            currentPlayerName: () => string | undefined;
            remainingPlayersCount: () => number;
            playerCountLabel: () => string;
        };

        expect(list.orderedPlayers().map((player) => player.name)).toEqual(['Carol', 'Alice', 'Bob']);
        expect(list.currentPlayerName()).toBe('Alice');
        expect(list.remainingPlayersCount()).toBe(2);
        expect(list.playerCountLabel()).toBe('2 restants / 3');

        activeGameServiceStub.currentPlayer.set(2);
        fixture.detectChanges();
        expect(list.currentPlayerName()).toBe('Bob');

        const activeGame = activeGameServiceStub.activeGame;
        expect(activeGame).toBeDefined();
        if (!activeGame) {
            fail('activeGame should be defined for this test');
            return;
        }

        activeGame.turnOrder = ['Alice'];
        activeGameServiceStub.hasChangedLocation.update((value) => !value);
        fixture.detectChanges();
        expect(list.remainingPlayersCount()).toBe(1);
        expect(list.playerCountLabel()).toBe('1 restant / 1');
    });

    it('returns empty/default values when no active game exists', () => {
        // Edge case: missing active game returns empty collections and fallback labels.
        const list = component as unknown as {
            orderedPlayers: () => ICharacter[];
            currentPlayerName: () => string | undefined;
            playerCountLabel: () => string;
        };

        activeGameServiceStub.activeGame = undefined;
        activeGameServiceStub.hasChangedLocation.update((value) => !value);
        fixture.detectChanges();

        expect(list.orderedPlayers()).toEqual([]);
        expect(list.currentPlayerName()).toBeUndefined();
        expect(list.playerCountLabel()).toBe('0 restant / 0');
    });

    it('exposes helper methods for avatars, flags, organizer, and current turn checks', () => {
        const list = component as unknown as {
            buildPlayerAvatarUrl: (avatar: Avatar) => string;
            isCurrentTurn: (playerName: string) => boolean;
            hasFlag: (player: ICharacter) => boolean;
            isOrganizer: (playerName: string) => boolean;
        };

        const activeGame = activeGameServiceStub.activeGame;
        expect(activeGame).toBeDefined();
        if (!activeGame) {
            fail('activeGame should be defined for this test');
            return;
        }

        const [alice, bob] = activeGame.players;
        activeGame.hasFlagId = bob.name;

        expect(list.buildPlayerAvatarUrl(Avatar.Avatar1)).toBe(buildAvatarAssetPath(Avatar.Avatar1, true));
        expect(list.isCurrentTurn('Alice')).toBeTrue();
        expect(list.isCurrentTurn('Bob')).toBeFalse();
        expect(list.hasFlag(bob)).toBeTrue();
        expect(list.hasFlag(alice)).toBeFalse();
        expect(list.isOrganizer('Alice')).toBeTrue();
        expect(list.isOrganizer('Bob')).toBeFalse();
    });

    it('applies CTF team colors with fallback to default color', () => {
        const list = component as unknown as {
            playerNameColor: (player: ICharacter) => string;
        };

        const activeGame = activeGameServiceStub.activeGame;
        expect(activeGame).toBeDefined();
        if (!activeGame) {
            fail('activeGame should be defined for this test');
            return;
        }

        const [alice, bob, carol] = activeGame.players;

        expect(list.playerNameColor(alice)).toBe(RED_TEAM_PLAYER_NAME_COLOR);
        expect(list.playerNameColor(bob)).toBe(BLUE_TEAM_PLAYER_NAME_COLOR);
        expect(list.playerNameColor(carol)).toBe(DEFAULT_PLAYER_NAME_COLOR);

        activeGame.game.gameMode = GameType.Classic;
        fixture.detectChanges();

        expect(list.playerNameColor(alice)).toBe(DEFAULT_PLAYER_NAME_COLOR);
    });
});

function createActiveGame(players: ICharacter[]): IActiveGame {
    const game: IGame = {
        gameTitle: 'Arena',
        description: 'A strategic arena',
        gameMode: GameType.Ctf,
        dateCreated: new Date('2026-01-01T00:00:00.000Z'),
        lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
        visibility: Visibility.Hidden,
        board: {
            cells: [[CellType.Empty]],
            items: [],
        },
    };

    return {
        _id: 'active-game-players',
        game,
        players,
        currentPlayerIndex: 0,
        turnOrder: ['Carol', 'Alice', 'Bob', 'Missing'],
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Alice',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: null,
        turnStartTimeStamp: 0,
        currentAttack: null,
    };
}

function createCharacter(name: string, team: Team | null, overrides: Partial<ICharacter> = {}): ICharacter {
    return {
        name,
        avatar: Avatar.Avatar1,
        initialHealth: 10,
        currentHealth: 9,
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
        team,
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
        ...overrides,
    };
}
