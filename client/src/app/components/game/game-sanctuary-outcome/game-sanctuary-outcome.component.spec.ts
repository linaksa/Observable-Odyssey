/**
 * Testing strategy — Game Sanctuary Outcome Component
 *
 * Approach:
 * - Validate sanctuary outcome visibility as a local-player-filtered signal with explicit success classification checks.
 * - Drive manual close and timer-driven close paths with fake timers to assert deterministic cleanup behavior.
 *
 * Edge cases covered:
 * - Missing local player or foreign outcomes should keep the popup hidden.
 * - Replacing outcomes and destroying the component should not leak pending timeout side effects.
 */
import { Component, signal } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GAME_SANCTUARY_OUTCOME_AUTO_CLOSE_MS } from '@app/constants/gameplay';
import { GameSanctuaryOutcomeComponent } from '@app/components/game/game-sanctuary-outcome/game-sanctuary-outcome.component';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { LocalPlayerService } from '@app/services/player/local-player.service';
import { ICharacter } from '@common/character';
import { Avatar, DiceType } from '@common/constants';
import { SanctuaryChoice } from '@common/info';
import { ItemType } from '@common/items';
import { ISanctuaryInteractedResult } from '@common/socket-payloads';

describe('GameSanctuaryOutcomeComponent', () => {
    let fixture: ComponentFixture<GameSanctuaryOutcomeComponent>;
    let component: GameSanctuaryOutcomeComponent;

    let activeGameServiceStub: {
        sanctuaryOutcome: ReturnType<typeof signal<ISanctuaryInteractedResult | null>>;
    };
    let localPlayerServiceSpy: jasmine.SpyObj<Pick<LocalPlayerService, 'getLocalPlayer'>>;

    beforeEach(async () => {
        activeGameServiceStub = {
            sanctuaryOutcome: signal<ISanctuaryInteractedResult | null>(null),
        };

        localPlayerServiceSpy = jasmine.createSpyObj<Pick<LocalPlayerService, 'getLocalPlayer'>>('LocalPlayerService', ['getLocalPlayer']);
        localPlayerServiceSpy.getLocalPlayer.and.returnValue(createCharacter('Alice'));

        const overrideInfo: MetadataOverride<Component> = {
            set: {
                template: '',
                providers: [
                    { provide: ActiveGameService, useValue: activeGameServiceStub },
                    { provide: LocalPlayerService, useValue: localPlayerServiceSpy },
                ],
            },
        };
        TestBed.overrideComponent(GameSanctuaryOutcomeComponent, overrideInfo);

        await TestBed.configureTestingModule({
            imports: [GameSanctuaryOutcomeComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameSanctuaryOutcomeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('shows outcome only for local player and classifies success/failure', () => {
        // Nominal case: local outcomes are visible and success classification mirrors payload.
        const popup = component as unknown as {
            localPlayerName: () => string | null;
            visibleOutcome: () => ISanctuaryInteractedResult | null;
            isSuccess: (outcome: ISanctuaryInteractedResult) => boolean;
        };

        expect(popup.localPlayerName()).toBe('Alice');
        expect(popup.visibleOutcome()).toBeNull();

        const localSuccess = createSanctuaryOutcome('Alice', true);
        activeGameServiceStub.sanctuaryOutcome.set(localSuccess);
        fixture.detectChanges();

        expect(popup.visibleOutcome()).toEqual(localSuccess);
        expect(popup.isSuccess(localSuccess)).toBeTrue();

        const localFailure = createSanctuaryOutcome('Alice', false);
        expect(popup.isSuccess(localFailure)).toBeFalse();

        activeGameServiceStub.sanctuaryOutcome.set(createSanctuaryOutcome('Bob', true));
        fixture.detectChanges();
        expect(popup.visibleOutcome()).toBeNull();

        localPlayerServiceSpy.getLocalPlayer.and.returnValue(undefined);
        const noLocalFixture = TestBed.createComponent(GameSanctuaryOutcomeComponent);
        const noLocalComponent = noLocalFixture.componentInstance as unknown as {
            localPlayerName: () => string | null;
            visibleOutcome: () => ISanctuaryInteractedResult | null;
        };
        noLocalFixture.detectChanges();

        activeGameServiceStub.sanctuaryOutcome.set(localSuccess);
        noLocalFixture.detectChanges();
        expect(noLocalComponent.localPlayerName()).toBeNull();
        expect(noLocalComponent.visibleOutcome()).toBeNull();

        noLocalFixture.destroy();
    });

    it('closes outcome manually and via auto-close timeout for visible local result', fakeAsync(() => {
        const popup = component as unknown as {
            closeOutcome: () => void;
            visibleOutcome: () => ISanctuaryInteractedResult | null;
        };

        const localOutcome = createSanctuaryOutcome('Alice', true);
        activeGameServiceStub.sanctuaryOutcome.set(localOutcome);
        fixture.detectChanges();
        expect(popup.visibleOutcome()).toEqual(localOutcome);

        popup.closeOutcome();
        expect(activeGameServiceStub.sanctuaryOutcome()).toBeNull();

        activeGameServiceStub.sanctuaryOutcome.set(localOutcome);
        fixture.detectChanges();

        tick(GAME_SANCTUARY_OUTCOME_AUTO_CLOSE_MS - 1);
        expect(activeGameServiceStub.sanctuaryOutcome()).toEqual(localOutcome);

        tick(1);
        expect(activeGameServiceStub.sanctuaryOutcome()).toBeNull();
    }));

    it('cleans pending timeout when component is destroyed', fakeAsync(() => {
        // Edge case: destroy should cancel auto-close timeout and preserve current outcome signal.
        const outcome = createSanctuaryOutcome('Alice', true);
        activeGameServiceStub.sanctuaryOutcome.set(outcome);
        fixture.detectChanges();

        tick(GAME_SANCTUARY_OUTCOME_AUTO_CLOSE_MS - 1);
        fixture.destroy();
        tick(1);

        expect(activeGameServiceStub.sanctuaryOutcome()).toEqual(outcome);
    }));
});

function createSanctuaryOutcome(playerId: string, succeeded: boolean): ISanctuaryInteractedResult {
    return {
        playerId,
        position: { x: 2, y: 3 },
        itemType: ItemType.FightSanctuary,
        choice: SanctuaryChoice.Double,
        succeeded,
        actionsLeft: 0,
        currentHealth: 9,
        attackPoints: 5,
        defensePoints: 4,
        sanctuaryActive: false,
        sanctuaryInactiveTurnsRemaining: 3,
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
