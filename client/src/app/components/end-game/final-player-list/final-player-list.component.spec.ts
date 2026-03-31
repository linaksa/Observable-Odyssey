import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FinalPlayerListComponent } from './final-player-list.component';

describe('PlayerListComponent', () => {
    let component: FinalPlayerListComponent;
    let fixture: ComponentFixture<FinalPlayerListComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [FinalPlayerListComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(FinalPlayerListComponent);
        component = fixture.componentInstance;
        await fixture.whenStable();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
