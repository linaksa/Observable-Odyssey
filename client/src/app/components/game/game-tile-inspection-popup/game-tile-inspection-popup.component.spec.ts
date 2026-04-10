/**
 * Testing strategy — Game tile inspection popup
 *
 * - Validate conditional rendering behavior from popup visibility.
 * - Assert rich tile information and optional player details rendering.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TileInfoPopupData } from '@common/info';
import { GameTileInspectionPopupComponent } from './game-tile-inspection-popup.component';

describe('GameTileInspectionPopupComponent', () => {
    let fixture: ComponentFixture<GameTileInspectionPopupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameTileInspectionPopupComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameTileInspectionPopupComponent);
    });

    it('renders tile and player information when visible', () => {
        fixture.componentRef.setInput('data', {
            visible: true,
            title: 'Forêt',
            description: 'Réduit les déplacements.',
            movementCost: '2',
            itemTitle: null,
            itemDescription: null,
            playerName: 'Alice',
            playerAvatarUrl: '/avatar.png',
        } satisfies TileInfoPopupData);
        fixture.detectChanges();

        const popup = fixture.nativeElement as HTMLElement;
        expect(popup.textContent).toContain('Forêt');
        expect(popup.textContent).toContain('Réduit les déplacements.');
        expect(popup.textContent).toContain('Coût déplacement');
        expect(popup.textContent).toContain('Alice');
        expect(popup.querySelector('hr')).not.toBeNull();
    });

    it('does not render when hidden', () => {
        fixture.componentRef.setInput('data', {
            visible: false,
            title: '',
            description: '',
            movementCost: '',
            itemTitle: null,
            itemDescription: null,
            playerName: null,
            playerAvatarUrl: null,
        } satisfies TileInfoPopupData);
        fixture.detectChanges();

        expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
    });
});
