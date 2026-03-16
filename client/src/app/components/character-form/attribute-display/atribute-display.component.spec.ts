import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AttributeDisplayComponent } from './attribute-display.component';

describe('AttributeDisplayComponent', () => {
    let component: AttributeDisplayComponent;
    let fixture: ComponentFixture<AttributeDisplayComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AttributeDisplayComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(AttributeDisplayComponent);
        component = fixture.componentInstance;

        component.name = 'Test attr';
        component.value = 0;
        component.bgColor = 'lightgray';

        fixture.detectChanges();
    });

    it('should create the component', () => {
        // Nominal case:
        // This component contains no logic, so we only validate that it is created without errors.

        expect(component).toBeTruthy();
    });
});
