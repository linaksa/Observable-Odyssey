/* eslint-disable @typescript-eslint/no-magic-numbers -- To make the spec file easier to read */
/**
 * Testing strategy — Game Ended Component
 *
 * Approach:
 * - Exercise the end screen as a timed redirect controller using explicit game and cancellation states.
 * - Assert derived getters/messages and timeout-driven navigation side effects through fake timers.
 *
 * Edge cases covered:
 * - Unfinished games, missing ids, and cancellation reasons must gate redirect targets safely.
 * - Destroy lifecycle should clear pending redirects before navigation side effects fire.
 */
import { Component, signal } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { GameEndedComponent } from '@app/components/game/game-ended/game-ended.component';
import {
    GAME_CANCELED_DEFAULT_END_MESSAGE,
    GAME_CANCELED_END_MESSAGE_BY_REASON,
    GAME_ENDED_REDIRECT_TO_HOME_MESSAGE,
    GAME_ENDED_REDIRECT_TO_STATS_MESSAGE,
} from '@app/constants/game-cancellation';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { IActiveGame } from '@common/active-game';
import { CellType } from '@common/board';
import { ICharacter } from '@common/character';
import { Avatar, DiceType, END_GAME_SCREEN_DURATION_MS } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';
import { GameCanceledReason } from '@common/socket-payloads';

describe('GameEndedComponent', () => {
    let fixture: ComponentFixture<GameEndedComponent>;
    let component: GameEndedComponent;

    let activeGameServiceStub: {
        activeGame: IActiveGame | undefined;
        gameCanceledReason: ReturnType<typeof signal<GameCanceledReason | null>>;
    };
    let localPlayerServiceSpy: jasmine.SpyObj<Pick<LocalPlayerService, 'clear'>>;
    let routerSpy: jasmine.SpyObj<Pick<Router, 'navigate'>>;

    beforeEach(async () => {
        activeGameServiceStub = {
            activeGame: createActiveGame('ended-game', true, 'Alice'),
            gameCanceledReason: signal<GameCanceledReason | null>(null),
        };

        localPlayerServiceSpy = jasmine.createSpyObj<Pick<LocalPlayerService, 'clear'>>('LocalPlayerService', ['clear']);
        routerSpy = jasmine.createSpyObj<Pick<Router, 'navigate'>>('Router', ['navigate']);
        routerSpy.navigate.and.returnValue(Promise.resolve(true));

        const overrideInfo: MetadataOverride<Component> = {
            set: {
                template: '',
                providers: [
                    { provide: ActiveGameService, useValue: activeGameServiceStub },
                    { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
                    { provide: Router, useValue: routerSpy },
                ],
            },
        };
        TestBed.overrideComponent(GameEndedComponent, overrideInfo);

        await TestBed.configureTestingModule({
            imports: [GameEndedComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameEndedComponent);
        component = fixture.componentInstance;
    });

    it('exposes winner/finished/cancellation getters and derived messages', () => {
        // Nominal case: completed game state exposes winner and redirect copy.
        fixture.detectChanges();

        const ended = component as unknown as {
            winner: string | null;
            isFinished: boolean;
            cancellationReason: GameCanceledReason | null;
            cancellationMessage: string;
            redirectMessage: string;
        };

        expect(ended.winner).toBe('Alice');
        expect(ended.isFinished).toBeTrue();
        expect(ended.cancellationReason).toBeNull();
        expect(ended.cancellationMessage).toBe(GAME_CANCELED_DEFAULT_END_MESSAGE);
        expect(ended.redirectMessage).toBe(GAME_ENDED_REDIRECT_TO_STATS_MESSAGE);

        activeGameServiceStub.gameCanceledReason.set('no-human-players');
        fixture.detectChanges();

        expect(ended.cancellationReason).toBe('no-human-players');
        expect(ended.cancellationMessage).toBe(GAME_CANCELED_END_MESSAGE_BY_REASON['no-human-players']);
        expect(ended.redirectMessage).toBe(GAME_ENDED_REDIRECT_TO_HOME_MESSAGE);
    });

    it('redirects to end stats page when game ended without cancellation', fakeAsync(() => {
        fixture.detectChanges();

        tick(END_GAME_SCREEN_DURATION_MS - 1);
        expect(routerSpy.navigate).not.toHaveBeenCalled();

        tick(1);
        expect(localPlayerServiceSpy.clear).not.toHaveBeenCalled();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/end/ended-game']);
    }));

    it('clears local player and redirects home when cancellation reason exists', fakeAsync(() => {
        activeGameServiceStub.gameCanceledReason.set('organizer-left-waiting-room');
        fixture.detectChanges();

        tick(END_GAME_SCREEN_DURATION_MS);

        expect(localPlayerServiceSpy.clear).toHaveBeenCalled();
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
    }));

    it('does not schedule redirect when game is unfinished or active game id is missing', fakeAsync(() => {
        // Edge case: unfinished or unidentifiable games should not navigate.
        activeGameServiceStub.activeGame = createActiveGame('unfinished-game', false, null);
        fixture.detectChanges();
        tick(END_GAME_SCREEN_DURATION_MS + 1);
        expect(routerSpy.navigate).not.toHaveBeenCalled();

        activeGameServiceStub.activeGame = createActiveGame(undefined, true, 'Alice');
        const noIdFixture = TestBed.createComponent(GameEndedComponent);
        noIdFixture.detectChanges();
        tick(END_GAME_SCREEN_DURATION_MS + 1);
        expect(routerSpy.navigate).not.toHaveBeenCalled();

        noIdFixture.destroy();
    }));

    it('exposes safe winner and finished defaults when no active game is available', () => {
        activeGameServiceStub.activeGame = undefined;
        fixture.detectChanges();

        const ended = component as unknown as {
            winner: string | null;
            isFinished: boolean;
        };

        expect(ended.winner).toBeNull();
        expect(ended.isFinished).toBeFalse();
    });

    it('clears timeout on destroy before redirect fires', fakeAsync(() => {
        fixture.detectChanges();

        tick(END_GAME_SCREEN_DURATION_MS - 10);
        fixture.destroy();
        tick(20);

        expect(routerSpy.navigate).not.toHaveBeenCalled();
    }));
});

function createActiveGame(id: string | undefined, isFinished: boolean, winner: string | null): IActiveGame {
    const player = createCharacter('Alice', 0, 0);

    const game: IGame = {
        gameTitle: 'Arena',
        description: 'A strategic arena',
        gameMode: GameType.Classic,
        dateCreated: new Date('2026-01-01T00:00:00.000Z'),
        lastModifiedDate: new Date('2026-01-01T00:00:00.000Z'),
        visibility: Visibility.Hidden,
        board: {
            cells: [[CellType.Empty]],
            items: [],
        },
    };

    return {
        _id: id ?? '',
        game,
        players: [player],
        currentPlayerIndex: 0,
        turnOrder: [player.name],
        isFinished,
        winner,
        messages: [],
        isDebugMode: false,
        organizerName: 'Organizer',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: null,
        turnStartTimeStamp: 0,
        currentAttack: null,
    };
}

function createCharacter(name: string, x: number, y: number): ICharacter {
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
        startingPosition: { x, y },
        currentPosition: { x, y },
        nCombats: 0,
        nVictories: 0,
        nDefeats: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        visitedCells: [],
    };
}
