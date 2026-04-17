/**
 * Testing strategy — Game Tile Inspection Popup Component
 *
 * Approach:
 * - Verify required popup inputs are exposed unchanged through signal-based accessors.
 * - Validate tooltip element getter behavior by toggling the optional view-child reference directly.
 *
 * Edge cases covered:
 * - Default position fallback should hold before explicit position input is provided.
 * - Missing tooltip view-child references should safely return null.
 */
import { ElementRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameTileInspectionPopupComponent } from '@app/components/game/game-tile-inspection-popup/game-tile-inspection-popup.component';
import { TileInfoPopupData } from '@common/info';

describe('GameTileInspectionPopupComponent', () => {
    let fixture: ComponentFixture<GameTileInspectionPopupComponent>;
    let component: GameTileInspectionPopupComponent;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameTileInspectionPopupComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameTileInspectionPopupComponent);
        component = fixture.componentInstance;
    });

    it('exposes required popup data and default position input values', () => {
        // Nominal case: required data and explicit positions are reflected by component accessors.
        const data: TileInfoPopupData = {
            visible: true,
            title: 'Tuile',
            description: 'Description',
            movementCost: '2',
            itemTitle: 'Flag',
            itemDescription: 'Capture objective',
            playerName: 'Alice',
            playerAvatarUrl: 'avatar.png',
        };

        fixture.componentRef.setInput('data', data);
        fixture.detectChanges();

        expect(component.data()).toEqual(data);
        expect(component.position()).toEqual({ x: 0, y: 0 });

        fixture.componentRef.setInput('position', { x: 33, y: 47 });
        fixture.detectChanges();

        expect(component.position()).toEqual({ x: 33, y: 47 });
    });

    it('returns tooltip element when view child is set and null otherwise', () => {
        // Edge case: tooltip getter safely handles undefined view-child references.
        expect(component.tooltipElement).toBeNull();

        const element = document.createElement('aside');
        (component as unknown as { tooltipElementRef?: ElementRef<HTMLElement> }).tooltipElementRef = new ElementRef(element);

        expect(component.tooltipElement).toBe(element);

        (component as unknown as { tooltipElementRef?: ElementRef<HTMLElement> }).tooltipElementRef = undefined;
        expect(component.tooltipElement).toBeNull();
    });
});
