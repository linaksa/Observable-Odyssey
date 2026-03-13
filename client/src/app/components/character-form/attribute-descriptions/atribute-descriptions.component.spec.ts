import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttributeDescriptionsComponent } from './attribute-descriptions.component';


describe('AttributeDescriptionsComponent', () => {
    let component: AttributeDescriptionsComponent;
    let fixture: ComponentFixture<AttributeDescriptionsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AttributeDescriptionsComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AttributeDescriptionsComponent);
        component = fixture.componentInstance;

        fixture.detectChanges();
    });

    it('should create the component', () => {
        // Nominal case:
        // This component contains no logic, so we only validate that it is created without errors.

        expect(component).toBeTruthy();
    });
});