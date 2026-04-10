/**
 * Testing strategy — GamePageComponent
 *
 * - Verify the gameplay page clears stale popup state on entry.
 * - Keep the tests focused on the page shell, not the child panels.
 */
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
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
            activeGame: { _id: string } | null;
        };
        closeAllPopups: jasmine.Spy;
        connectDebugSocket: jasmine.Spy;
        connectGameLogs: jasmine.Spy;
        resolveActiveGameId: jasmine.Spy<(activeGameId?: string) => string | undefined>;
        setActiveGame: jasmine.Spy;
        connectGameplaySocket: jasmine.Spy;
        clearGameLogs: jasmine.Spy;
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
                activeGame: { _id: 'active-game-id' },
            },
            closeAllPopups: jasmine.createSpy('closeAllPopups'),
            connectDebugSocket: jasmine.createSpy('connectDebugSocket'),
            connectGameLogs: jasmine.createSpy('connectGameLogs'),
            resolveActiveGameId: jasmine.createSpy('resolveActiveGameId').and.callFake((activeGameId?: string) => activeGameId),
            setActiveGame: jasmine.createSpy('setActiveGame'),
            connectGameplaySocket: jasmine.createSpy('connectGameplaySocket'),
            clearGameLogs: jasmine.createSpy('clearGameLogs'),
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
            schemas: [NO_ERRORS_SCHEMA],
            providers: [
                { provide: ActivatedRoute, useValue: { params: of({ activeGameId: 'active-game-id' }) } },
                { provide: Router, useValue: routerSpy },
                { provide: GamePageFacadeService, useValue: facadeStub },
            ],
        })
            .overrideComponent(GamePageComponent, {
                set: {
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
        expect(facadeStub.connectGameLogs).toHaveBeenCalledTimes(1);
        expect(facadeStub.clearGameLogs).toHaveBeenCalledTimes(1);
    });

    it('should keep the gameplay panels within the available viewport height', () => {
        fixture = TestBed.createComponent(GamePageComponent);
        fixture.detectChanges();

        const content = fixture.nativeElement.querySelector('.content');
        const panelsSection = fixture.nativeElement.querySelector('section');

        expect(content).toBeTruthy();
        expect(content.classList.contains('h-dvh')).toBeTrue();
        expect(content.classList.contains('overflow-hidden')).toBeTrue();
        expect(panelsSection).toBeTruthy();
        expect(panelsSection.classList.contains('flex-1')).toBeTrue();
        expect(panelsSection.classList.contains('min-h-0')).toBeTrue();
        expect(panelsSection.classList.contains('overflow-hidden')).toBeTrue();
    });
});
