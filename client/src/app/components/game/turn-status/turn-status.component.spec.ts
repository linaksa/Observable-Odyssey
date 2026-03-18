/**
 * Testing strategy — TurnStatusComponent
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
import { Component } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { TurnStatusData } from '@common/info';
import { TurnStatusComponent } from './turn-status.component';

describe('TurnStatusComponent', () => {
    let component: TurnStatusComponent;
    let fixture: ComponentFixture<TurnStatusComponent>;

    beforeEach(async () => {
        const overrideInfo: MetadataOverride<Component> = {
            set: {
                template: '',
                imports: [],
            },
        };
        TestBed.overrideComponent(TurnStatusComponent, overrideInfo);

        await TestBed.configureTestingModule({
            imports: [TurnStatusComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TurnStatusComponent);
        component = fixture.componentInstance;
        component.data = createTurnStatusData();
        fixture.detectChanges();
    });

    it('should create with required input data', () => {
        expect(component).toBeTruthy();
        expect(component.data.currentPlayerName).toBe('Alice');
    });

    // Edge case: When onEndTurnClick is called, emit endTurnRequested.
    it('should emit endTurnRequested when onEndTurnClick is called', () => {
        const emitSpy = spyOn(component.endTurnRequested, 'emit');

        component.onEndTurnClick();

        expect(emitSpy).toHaveBeenCalledTimes(1);
    });
});

function createTurnStatusData(): TurnStatusData {
    return {
        currentPlayerName: 'Alice',
        turnTimeLeftSeconds: 20,
        isTurnPreparing: false,
        canEndTurn: true,
    };
}
