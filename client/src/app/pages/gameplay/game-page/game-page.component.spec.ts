/**
 * Testing strategy — GamePageComponent
 *
 * - Verify the gameplay page clears stale popup state on entry.
 * - Keep the test focused on the page bootstrap path, not the child panels.
 */
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { GamePageFacadeService } from '@app/services/gameplay/game-page.facade.service';
import { GamePageComponent } from './game-page.component';
import { of } from 'rxjs';

describe('GamePageComponent', () => {
    let fixture: ComponentFixture<GamePageComponent>;
    let facadeStub: {
        activeGameService: {
            isLoading: ReturnType<typeof signal<boolean>>;
            activeGame: null;
        };
        closeAllPopups: jasmine.Spy;
        connectDebugSocket: jasmine.Spy;
        resolveActiveGameId: jasmine.Spy<(activeGameId?: string) => string | undefined>;
        setActiveGame: jasmine.Spy;
        connectGameplaySocket: jasmine.Spy;
        onPlayersUpdated: jasmine.Spy;
        applyPlayersUpdate: jasmine.Spy;
        initializeTurnListeners: jasmine.Spy;
        emitJoinGame: jasmine.Spy;
        destroyTurnService: jasmine.Spy;
        currentAttack: null;
        currentPlayerName: null;
        turnTimeLeftSeconds: null;
        isTurnPreparing: false;
        canEndTurn: false;
        isGameFinished: false;
        turnStatusData: unknown;
        pendingFlagQuestion: null;
        getLocalPlayer: jasmine.Spy;
        endTurn: jasmine.Spy;
        respondToFlagRequest: jasmine.Spy;
        abandonGame: jasmine.Spy;
        emitDebugToggle: jasmine.Spy;
    };
    let routerSpy: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
        facadeStub = {
            activeGameService: {
                isLoading: signal(false),
                activeGame: null,
            },
            closeAllPopups: jasmine.createSpy('closeAllPopups'),
            connectDebugSocket: jasmine.createSpy('connectDebugSocket'),
            resolveActiveGameId: jasmine.createSpy('resolveActiveGameId').and.callFake((activeGameId?: string) => activeGameId),
            setActiveGame: jasmine.createSpy('setActiveGame'),
            connectGameplaySocket: jasmine.createSpy('connectGameplaySocket'),
            onPlayersUpdated: jasmine.createSpy('onPlayersUpdated').and.returnValue(of([])),
            applyPlayersUpdate: jasmine.createSpy('applyPlayersUpdate'),
            initializeTurnListeners: jasmine.createSpy('initializeTurnListeners'),
            emitJoinGame: jasmine.createSpy('emitJoinGame'),
            destroyTurnService: jasmine.createSpy('destroyTurnService'),
            currentAttack: null,
            currentPlayerName: null,
            turnTimeLeftSeconds: null,
            isTurnPreparing: false,
            canEndTurn: false,
            isGameFinished: false,
            turnStatusData: {},
            pendingFlagQuestion: null,
            getLocalPlayer: jasmine.createSpy('getLocalPlayer'),
            endTurn: jasmine.createSpy('endTurn'),
            respondToFlagRequest: jasmine.createSpy('respondToFlagRequest'),
            abandonGame: jasmine.createSpy('abandonGame'),
            emitDebugToggle: jasmine.createSpy('emitDebugToggle'),
        };

        await TestBed.configureTestingModule({
            imports: [GamePageComponent],
            providers: [
                { provide: ActivatedRoute, useValue: { params: of({ activeGameId: 'active-game-id' }) } },
                { provide: Router, useValue: routerSpy },
                { provide: GamePageFacadeService, useValue: facadeStub },
            ],
        })
            .overrideComponent(GamePageComponent, {
                set: {
                    template: '',
                    imports: [],
                    providers: [],
                },
            })
            .compileComponents();
    });

    it('should clear popups when the page initializes', () => {
        fixture = TestBed.createComponent(GamePageComponent);
        fixture.detectChanges();

        expect(facadeStub.closeAllPopups).toHaveBeenCalledTimes(1);
        expect(facadeStub.connectDebugSocket).toHaveBeenCalledTimes(1);
    });
});
