/**
 * Testing strategy — Virtual Player Dialog Component
 *
 * Approach:
 * - Render the dialog with mocked form/game services.
 * - Verify form defaults, profile label resolution, creation flow, and cleanup behavior.
 *
 * Edge cases covered:
 * - Unknown profile values should return an empty description.
 * - Destroy should safely handle optional subscription cleanup.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CharacterFormService } from '@app/services/forms/character-form.service';
import { ActiveGameService } from '@app/services/gameplay/active-game.service';
import { IActiveGameWithPlayer } from '@common/active-game';
import { VirtualPlayerProfile } from '@common/character';
import { of, Subscription } from 'rxjs';
import { VirtualPlayerDialogComponent } from './virtual-player-dialog.component';

describe('VirtualPlayerDialogComponent', () => {
    let component: VirtualPlayerDialogComponent;
    let fixture: ComponentFixture<VirtualPlayerDialogComponent>;
    let characterFormServiceSpy: jasmine.SpyObj<CharacterFormService>;

    beforeEach(async () => {
        characterFormServiceSpy = jasmine.createSpyObj<CharacterFormService>('CharacterFormService', ['createVirtualPlayer']);
        characterFormServiceSpy.createVirtualPlayer.and.returnValue(of({} as IActiveGameWithPlayer));

        await TestBed.configureTestingModule({
            imports: [VirtualPlayerDialogComponent],
            providers: [
                { provide: CharacterFormService, useValue: characterFormServiceSpy },
                { provide: ActiveGameService, useValue: { activeGame: { _id: 'active-game-id' } } as ActiveGameService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(VirtualPlayerDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should initialize form with the default aggressive profile', () => {
        expect(component.form.get('profileOption')?.value).toBe(VirtualPlayerProfile.Agressive);
    });

    it('should return selected profile description and empty fallback for unknown value', () => {
        // Nominal case: known profile maps to the expected description.
        component.form.get('profileOption')?.setValue(VirtualPlayerProfile.Defensive);
        expect(component.selectedProfileLabel).toContain('éviter le combat');

        // Edge case: unsupported profile value should not crash.
        component.form.get('profileOption')?.setValue('unknown-profile');
        expect(component.selectedProfileLabel).toBe('');
    });

    it('should create a virtual player and emit close event on success', async () => {
        const closeSpy = jasmine.createSpy('closeDialog');
        component.closeDialog.subscribe(closeSpy);

        component.form.get('profileOption')?.setValue(VirtualPlayerProfile.Defensive);
        await component.createVirtualPlayer();

        expect(characterFormServiceSpy.createVirtualPlayer).toHaveBeenCalledWith(VirtualPlayerProfile.Defensive, 'active-game-id');
        expect(closeSpy).toHaveBeenCalled();
    });

    it('should unsubscribe optional subscription in ngOnDestroy', () => {
        const subscriptionSpy = jasmine.createSpyObj<Subscription>('Subscription', ['unsubscribe']);
        (component as unknown as { characterFormSubscription?: Subscription }).characterFormSubscription = subscriptionSpy;

        component.ngOnDestroy();
        expect(subscriptionSpy.unsubscribe).toHaveBeenCalled();

        (component as unknown as { characterFormSubscription?: Subscription }).characterFormSubscription = undefined;
        expect(() => component.ngOnDestroy()).not.toThrow();
    });
});
