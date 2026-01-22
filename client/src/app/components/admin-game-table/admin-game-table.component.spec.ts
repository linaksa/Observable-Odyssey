import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminGameTableComponent } from './admin-game-table.component';

describe('AdminGameTableComponent', () => {
  let component: AdminGameTableComponent;
  let fixture: ComponentFixture<AdminGameTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdminGameTableComponent],
    })
      .compileComponents();

    fixture = TestBed.createComponent(AdminGameTableComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
