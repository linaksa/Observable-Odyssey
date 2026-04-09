import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SanctuaryPopupData } from '@common/info';
import { SanctuaryPopupComponent } from './sanctuary-popup.component';

describe('SanctuaryPopupComponent', () => {
    let component: SanctuaryPopupComponent;
    let fixture: ComponentFixture<SanctuaryPopupComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [SanctuaryPopupComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(SanctuaryPopupComponent);
        component = fixture.componentInstance;
    });

    it('should expose required popup data and emit choices', () => {
        const data: SanctuaryPopupData = {
            visible: true,
            title: 'Sanctuaire',
            description: 'Interaction',
            effectLabel: 'Bonus',
        };
        const choiceSpy = jasmine.createSpy('choice');
        const cancelSpy = jasmine.createSpy('cancel');

        component.choiceSelected.subscribe(choiceSpy);
        component.cancel.subscribe(cancelSpy);
        fixture.componentRef.setInput('data', data);
        fixture.detectChanges();

        expect(component.data()).toEqual(data);
        expect((fixture.nativeElement.querySelector('h4') as HTMLElement).textContent?.trim()).toBe('Sanctuaire :');

        fixture.nativeElement.querySelector('[data-testid="sanctuary-standard-choice"]').click();
        fixture.nativeElement.querySelector('[data-testid="sanctuary-double-choice"]').click();
        fixture.nativeElement.querySelector('[data-testid="sanctuary-cancel-choice"]').click();

        expect(choiceSpy.calls.allArgs()).toEqual([['standard'], ['double']]);
        expect(cancelSpy).toHaveBeenCalledTimes(1);
    });
});
