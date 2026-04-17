/**
 * Testing strategy — Avatar Preview Component
 *
 * Approach:
 * - Verify pure mapping logic by asserting getImageForAvatar returns the expected portrait path.
 * - Exercise template branching for both selected-avatar and no-avatar states.
 * - Assert rendered img attributes (src, alt, class) to protect preview accessibility and styling.
 *
 * Edge cases covered:
 * - Shows placeholder guidance text and no <img> element when avatar is null.
 * - Ensures selected avatars map to the correct portrait asset file.
 * - Confirms pixelated rendering class stays applied to the displayed portrait.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Avatar } from '@common/constants';
import { AvatarPreviewComponent } from '@app/components/character-form/avatar-preview/avatar-preview.component';

describe('AvatarPreviewComponent', () => {
    let component: AvatarPreviewComponent;
    let fixture: ComponentFixture<AvatarPreviewComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AvatarPreviewComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AvatarPreviewComponent);
        component = fixture.componentInstance;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should build avatar image path from model', () => {
        const imagePath = component.getImageForAvatar(Avatar.Avatar2);

        expect(imagePath).toBe('./assets/characters/brick-portrait.png');
    });

    // Edge case: When no avatar is selected, show placeholder.
    it('should show placeholder when no avatar is selected', () => {
        component.avatar = null;
        fixture.detectChanges();

        const host = fixture.nativeElement as HTMLElement;
        expect(host.textContent).toContain('Veuillez en choisir un ci-dessous');
        expect(host.querySelector('img')).toBeNull();
    });

    it('should render avatar image when avatar is selected', () => {
        component.avatar = Avatar.Avatar4;
        fixture.detectChanges();

        const image = (fixture.nativeElement as HTMLElement).querySelector('img');

        expect(image?.getAttribute('src')).toBe('./assets/characters/cocoa-portrait.png');
        expect(image?.getAttribute('alt')).toBe(Avatar.Avatar4);
        expect(image?.className).toContain('[image-rendering:pixelated]');
    });
});
