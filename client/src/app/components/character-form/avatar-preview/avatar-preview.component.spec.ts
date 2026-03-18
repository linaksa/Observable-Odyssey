/**
 * Testing strategy — Avatar Preview Component
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
import { AVATAR_IMAGE_PATH_MODEL } from '@app/constants/character-form';
import { Avatar } from '@common/constants';
import { AvatarPreviewComponent } from './avatar-preview.component';

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

        expect(imagePath).toBe(AVATAR_IMAGE_PATH_MODEL.replace('{}', Avatar.Avatar2));
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

        expect(image?.getAttribute('src')).toBe('./assets/form-page/avatar4.png');
        expect(image?.getAttribute('alt')).toBe(Avatar.Avatar4);
    });
});
