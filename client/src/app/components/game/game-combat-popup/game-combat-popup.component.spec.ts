/* eslint-disable @typescript-eslint/no-magic-numbers -- To make the spec file easier to read */
/**
 * Testing strategy — Game Combat Popup Component
 *
 * Approach:
 * - Drive participant and spectator combat states through service signals and verify rendered/computed popup state.
 * - Assert posture selection, confirmation side effects, and timer-driven state resets through explicit transitions.
 *
 * Edge cases covered:
 * - Spectators or non-participants should not trigger combat action side effects.
 * - Null timers, missing players, and turn/timer rewinds should reset dialog/action state safely.
 */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameCombatPopupComponent } from '@app/components/game/game-combat-popup/game-combat-popup.component';
import {
    COMBAT_DURATION_SECONDS,
    GAME_COMBAT_DEFAULT_DIALOG_MESSAGE,
    GAME_COMBAT_DEFENSIVE_CONFIRMED_MESSAGE,
    GAME_COMBAT_DEFENSIVE_SELECTED_MESSAGE,
    GAME_COMBAT_OFFENSIVE_CONFIRMED_MESSAGE,
    GAME_COMBAT_OFFENSIVE_SELECTED_MESSAGE,
} from '@app/constants/gameplay';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { GameTurnService } from '@app/services/gameplay/game-turn.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { buildAvatarAssetPath } from '@app/utils/avatar-path';
import { IActiveGame, ICurrentAttack } from '@common/active-game';
import { AttackPosture } from '@common/attack-result';
import { CellType } from '@common/board';
import { ICharacter, VirtualPlayerProfile } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { GameType, IGame, Visibility } from '@common/game';

describe('GameCombatPopupComponent', () => {
    let fixture: ComponentFixture<GameCombatPopupComponent>;
    let component: GameCombatPopupComponent;

    let activeGameServiceStub: {
        activeGame: IActiveGame;
        chooseAttackMode: jasmine.Spy;
        getPlayerByName: jasmine.Spy<(playerName: string) => ICharacter | undefined>;
        roundOutcome: ReturnType<typeof signal<unknown>>;
    };
    let gameTurnServiceStub: {
        isCombatActive: ReturnType<typeof signal<boolean>>;
        combatTimeLeftSeconds: ReturnType<typeof signal<number | null>>;
    };
    let localPlayerServiceSpy: jasmine.SpyObj<Pick<LocalPlayerService, 'getLocalPlayer'>>;

    beforeEach(async () => {
        const alice = createCharacter('Alice');
        const bob = createCharacter('Bob');
        const currentAttack = createAttack('Alice', 'Bob', 1);

        activeGameServiceStub = {
            activeGame: createActiveGame([alice, bob], currentAttack),
            chooseAttackMode: jasmine.createSpy('chooseAttackMode'),
            getPlayerByName: jasmine
                .createSpy('getPlayerByName')
                .and.callFake((playerName: string) => activeGameServiceStub.activeGame.players.find((player) => player.name === playerName)),
            roundOutcome: signal(null),
        };

        gameTurnServiceStub = {
            isCombatActive: signal(true),
            combatTimeLeftSeconds: signal(8),
        };

        localPlayerServiceSpy = jasmine.createSpyObj<Pick<LocalPlayerService, 'getLocalPlayer'>>('LocalPlayerService', ['getLocalPlayer']);
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(alice);

        await TestBed.configureTestingModule({
            imports: [GameCombatPopupComponent],
            providers: [
                { provide: ActiveGameService, useValue: activeGameServiceStub },
                { provide: GameTurnService, useValue: gameTurnServiceStub },
                { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameCombatPopupComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('exposes full combat view state for local participants and spectator fallback', () => {
        // Nominal case: local participants see full combat state while spectators stay in summary mode.
        const popup = component as unknown as {
            isFullCombatView: () => boolean;
            currentAttack: () => ICurrentAttack | null;
            localPlayerName: () => string | null;
            attackerCharacter: ICharacter | undefined;
            defenderCharacter: ICharacter | undefined;
            allPlayersVirtual: () => boolean;
            getCombatSummary: () => string;
            combatTimeLeftDisplaySeconds: () => number;
            combatActive: () => boolean;
        };

        expect(popup.combatActive()).toBeTrue();
        expect(popup.localPlayerName()).toBe('Alice');
        expect(popup.currentAttack()?.attacker).toBe('Alice');
        expect(popup.isFullCombatView()).toBeTrue();
        expect(popup.attackerCharacter?.name).toBe('Alice');
        expect(popup.defenderCharacter?.name).toBe('Bob');
        expect(popup.allPlayersVirtual()).toBeFalsy();
        expect(popup.getCombatSummary()).toBe('Alice et Bob sont en combat');
        expect(popup.combatTimeLeftDisplaySeconds()).toBe(8);

        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Carol'));
        const spectatorFixture = TestBed.createComponent(GameCombatPopupComponent);
        const spectatorPopup = spectatorFixture.componentInstance as unknown as {
            isFullCombatView: () => boolean;
        };
        spectatorFixture.detectChanges();

        expect(spectatorPopup.isFullCombatView()).toBeFalse();
        spectatorFixture.destroy();
    });

    it('handles action selection and confirmation for both postures', () => {
        const popup = component as unknown as {
            selectedMode: AttackPosture | null;
            dialogMessage: string;
            selectAction: (mode: AttackPosture) => void;
            confirmAction: () => void;
            actionsLocked: () => boolean;
        };

        expect(popup.selectedMode).toBeNull();
        expect(popup.dialogMessage).toBe(GAME_COMBAT_DEFAULT_DIALOG_MESSAGE);
        expect(popup.actionsLocked()).toBeFalse();

        popup.selectAction(AttackPosture.Defensive);
        expect(popup.selectedMode).toBe(AttackPosture.Defensive);
        expect(popup.dialogMessage).toBe(GAME_COMBAT_DEFENSIVE_SELECTED_MESSAGE);

        popup.confirmAction();
        expect(activeGameServiceStub.chooseAttackMode).toHaveBeenCalledWith(AttackPosture.Defensive);
        expect(popup.dialogMessage).toBe(GAME_COMBAT_DEFENSIVE_CONFIRMED_MESSAGE);
        expect(popup.actionsLocked()).toBeTrue();

        popup.selectAction(AttackPosture.Offensive);
        expect(popup.selectedMode).toBe(AttackPosture.Defensive);

        activeGameServiceStub.chooseAttackMode.calls.reset();
        gameTurnServiceStub.isCombatActive.set(false);
        fixture.detectChanges();
        gameTurnServiceStub.isCombatActive.set(true);
        gameTurnServiceStub.combatTimeLeftSeconds.set(6);
        fixture.detectChanges();

        popup.selectAction(AttackPosture.Offensive);
        expect(popup.selectedMode).toBe(AttackPosture.Offensive);
        expect(popup.dialogMessage).toBe(GAME_COMBAT_OFFENSIVE_SELECTED_MESSAGE);

        popup.confirmAction();
        expect(activeGameServiceStub.chooseAttackMode).toHaveBeenCalledWith(AttackPosture.Offensive);
        expect(popup.dialogMessage).toBe(GAME_COMBAT_OFFENSIVE_CONFIRMED_MESSAGE);
    });

    it('ignores combat actions when local player is not in the active duel', () => {
        // Edge case: non-participants cannot lock actions or emit posture choices.
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Spectator'));
        const spectatorFixture = TestBed.createComponent(GameCombatPopupComponent);
        const spectatorPopup = spectatorFixture.componentInstance as unknown as {
            selectedMode: AttackPosture | null;
            dialogMessage: string;
            selectAction: (mode: AttackPosture) => void;
            confirmAction: () => void;
        };
        spectatorFixture.detectChanges();

        spectatorPopup.selectAction(AttackPosture.Defensive);
        spectatorPopup.confirmAction();

        expect(spectatorPopup.selectedMode).toBeNull();
        expect(spectatorPopup.dialogMessage).toBe(GAME_COMBAT_DEFAULT_DIALOG_MESSAGE);
        expect(activeGameServiceStub.chooseAttackMode).not.toHaveBeenCalled();
        spectatorFixture.destroy();
    });

    it('returns fallback values when local player and attack are missing', () => {
        // Edge case: absent local player and attack should yield safe fallback values.
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);
        activeGameServiceStub.activeGame = createActiveGame([createCharacter('Alice'), createCharacter('Bob')], null);

        const nullStateFixture = TestBed.createComponent(GameCombatPopupComponent);
        const popup = nullStateFixture.componentInstance as unknown as {
            localPlayerName: () => string | null;
            currentAttack: () => ICurrentAttack | null;
            isFullCombatView: () => boolean;
            allPlayersVirtual: () => boolean;
            attackerCharacter: ICharacter | undefined;
            defenderCharacter: ICharacter | undefined;
            getCombatSummary: () => string;
        };
        nullStateFixture.detectChanges();

        expect(popup.localPlayerName()).toBeNull();
        expect(popup.currentAttack()).toBeNull();
        expect(popup.isFullCombatView()).toBeFalse();
        expect(popup.allPlayersVirtual()).toBeFalse();
        expect(popup.attackerCharacter).toBeUndefined();
        expect(popup.defenderCharacter).toBeUndefined();
        expect(popup.getCombatSummary()).toBe(' et  sont en combat');

        nullStateFixture.destroy();
    });

    it('returns early when confirming without a selection or after confirmation', () => {
        // Edge case: confirmAction is idempotent once a posture has already been confirmed.
        const popup = component as unknown as {
            selectAction: (mode: AttackPosture) => void;
            confirmAction: () => void;
        };

        popup.confirmAction();
        expect(activeGameServiceStub.chooseAttackMode).not.toHaveBeenCalled();

        popup.selectAction(AttackPosture.Offensive);
        popup.confirmAction();
        popup.confirmAction();

        expect(activeGameServiceStub.chooseAttackMode).toHaveBeenCalledTimes(1);
    });

    it('resets selected action when combat turn changes or timer rewinds', () => {
        const popup = component as unknown as {
            selectedMode: AttackPosture | null;
            dialogMessage: string;
            selectAction: (mode: AttackPosture) => void;
        };

        popup.selectAction(AttackPosture.Defensive);
        expect(popup.selectedMode).toBe(AttackPosture.Defensive);

        activeGameServiceStub.activeGame.currentAttack = createAttack('Alice', 'Bob', 2);
        gameTurnServiceStub.combatTimeLeftSeconds.set(4);
        fixture.detectChanges();

        expect(popup.selectedMode).toBeNull();
        expect(popup.dialogMessage).toBe(GAME_COMBAT_DEFAULT_DIALOG_MESSAGE);

        popup.selectAction(AttackPosture.Offensive);
        expect(popup.selectedMode).toBe(AttackPosture.Offensive);

        gameTurnServiceStub.combatTimeLeftSeconds.set(3);
        fixture.detectChanges();
        gameTurnServiceStub.combatTimeLeftSeconds.set(7);
        fixture.detectChanges();

        expect(popup.selectedMode).toBeNull();
        expect(popup.dialogMessage).toBe(GAME_COMBAT_DEFAULT_DIALOG_MESSAGE);
    });

    it('computes timer percent and player rendering helpers safely', () => {
        const popup = component as unknown as {
            combatTimerPercent: number;
            getAvatarUrl: (player: ICharacter | undefined) => string;
            getHealthRange: (player: ICharacter | undefined) => unknown[];
            getFilledBlocks: (player: ICharacter | undefined) => number;
        };

        expect(popup.combatTimerPercent).toBeCloseTo((8 / COMBAT_DURATION_SECONDS) * 100, 6);
        gameTurnServiceStub.combatTimeLeftSeconds.set(null);
        fixture.detectChanges();
        expect(popup.combatTimerPercent).toBe(0);

        const alice = activeGameServiceStub.activeGame.players[0];
        alice.initialHealth = 6;
        alice.currentHealth = 8;

        expect(popup.getAvatarUrl(alice)).toBe(buildAvatarAssetPath(alice.avatar, true));
        expect(popup.getAvatarUrl(undefined)).toBe('');
        expect(popup.getHealthRange(alice).length).toBe(6);
        expect(popup.getHealthRange(undefined).length).toBe(0);
        expect(popup.getFilledBlocks(alice)).toBe(6);
        expect(popup.getFilledBlocks({ ...alice, initialHealth: 0 })).toBe(0);

        const virtualAlice = createCharacter('Alice');
        const virtualBob = createCharacter('Bob');
        virtualAlice.virtualPlayerProfile = VirtualPlayerProfile.Defensive;
        virtualBob.virtualPlayerProfile = VirtualPlayerProfile.Agressive;
        activeGameServiceStub.activeGame = createActiveGame([virtualAlice, virtualBob], createAttack('Alice', 'Bob', 1));

        const virtualFixture = TestBed.createComponent(GameCombatPopupComponent);
        const virtualPopup = virtualFixture.componentInstance as unknown as { allPlayersVirtual: () => unknown };
        virtualFixture.detectChanges();

        expect(virtualPopup.allPlayersVirtual()).toBeTruthy();
        virtualFixture.destroy();
    });
});

function createActiveGame(players: ICharacter[], currentAttack: ICurrentAttack | null): IActiveGame {
    const game: IGame = {
        gameTitle: 'Arena',
        description: '',
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
        _id: 'active-game-1',
        game,
        players,
        currentPlayerIndex: 0,
        turnOrder: players.map((player) => player.name),
        isFinished: false,
        winner: null,
        messages: [],
        isDebugMode: false,
        organizerName: 'Organizer',
        maxPlayerCount: 4,
        turnIsInPreparation: false,
        hasFlagId: null,
        turnStartTimeStamp: 0,
        currentAttack,
    };
}

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

function createAttack(attacker: string, defender: string, turnCount: number): ICurrentAttack {
    return {
        attacker,
        defender,
        turnCount,
        suspendedTurnTimer: 5,
        attackerPosture: null,
        defenderPosture: null,
    };
}
