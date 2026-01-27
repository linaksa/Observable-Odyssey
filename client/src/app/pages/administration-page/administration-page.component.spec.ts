import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideRouter, RouterLink } from '@angular/router';
import { AdministrationPageComponent } from './administration-page.component';

describe('AdministrationPageComponent', () => {
    let component: AdministrationPageComponent;
    let fixture: ComponentFixture<AdministrationPageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AdministrationPageComponent, RouterLink],
            providers: [provideRouter([])],
        }).compileComponents();

        fixture = TestBed.createComponent(AdministrationPageComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
