import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WaitPageComponent } from './wait-page.component';

describe('WaitPageComponent', () => {
    let component: WaitPageComponent;
    let fixture: ComponentFixture<WaitPageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WaitPageComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(WaitPageComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
