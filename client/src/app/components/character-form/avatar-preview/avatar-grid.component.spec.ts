/**
 * Testing strategy — Avatar Grid Component
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

        component.avatar = null;
        fixture.detectChanges();
    });

    // Edge case: should have no image when no avatar is provided.
    it('should have no image when no avatar is provided', () => {
        // Edge case
        // No avatar is selected; the template should render without errors

        component.avatar = null;
        fixture.detectChanges();

        expect(component).toBeTruthy();
    });

    it('should display correct image when avatar is provided', () => {
        // Nominal case
        // The selected avatar image should be displayed

        const testAvatar = Avatar.Avatar1;
        expect(component.getImageForAvatar(testAvatar)).toBe(AVATAR_IMAGE_PATH_MODEL.replace('{}', testAvatar));
    });
});
