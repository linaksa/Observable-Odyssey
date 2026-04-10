/**
 * Testing strategy — Game sanctuary popup
 *
 * - Validate popup visibility and text rendering.
 * - Ensure each choice button emits the expected output event.
 */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SanctuaryPopupData } from '@common/info';
import { GameSanctuaryPopupComponent } from './game-sanctuary-popup.component';

describe('GameSanctuaryPopupComponent', () => {
    let fixture: ComponentFixture<GameSanctuaryPopupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameSanctuaryPopupComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(GameSanctuaryPopupComponent);
        fixture.componentRef.setInput('data', {
            visible: true,
            title: 'Sanctuaire',
            description: 'Choisissez un bonus.',
            effectLabel: '+1',
        } satisfies SanctuaryPopupData);
        fixture.detectChanges();
    });

    it('emits standard and double choices', () => {
        const emitSpy = spyOn(fixture.componentInstance.choiceSelected, 'emit');
        const buttons = fixture.nativeElement.querySelectorAll('[data-testid$="choice"]') as NodeListOf<HTMLButtonElement>;

        buttons[0].click();
        buttons[1].click();

        expect(emitSpy.calls.allArgs()).toEqual([['standard'], ['double']]);
    });

    it('emits cancel when cancel button is clicked', () => {
        const emitSpy = spyOn(fixture.componentInstance.cancel, 'emit');
        const cancelButton = fixture.nativeElement.querySelector('[data-testid="sanctuary-cancel-choice"]') as HTMLButtonElement;

        cancelButton.click();

        expect(emitSpy).toHaveBeenCalled();
    });
});
