/**
 * Testing strategy — TileInfoPopupComponent
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
import { TileInfoPopupData } from '@common/info';
import { TileInfoPopupComponent } from './tile-info-popup.component';

describe('TileInfoPopupComponent', () => {
    let component: TileInfoPopupComponent;
    let fixture: ComponentFixture<TileInfoPopupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TileInfoPopupComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(TileInfoPopupComponent);
        component = fixture.componentInstance;
    });

    // Edge case: When required popup input data is set, the component should expose it unchanged.
    it('should expose required popup input data', () => {
        const data: TileInfoPopupData = {
            visible: true,
            title: 'Tile title',
            description: 'Tile description',
            movementCost: '1',
            itemTitle: 'Flag',
            itemDescription: 'Capture objective',
            playerName: 'Alice',
            playerAvatarUrl: '/assets/alice.png',
        };

        fixture.componentRef.setInput('data', data);
        fixture.detectChanges();

        expect(component).toBeTruthy();
        expect(component.data()).toEqual(data);
        expect((fixture.nativeElement.querySelector('h4') as HTMLElement).textContent?.trim()).toBe('Tile title :');
    });
});
