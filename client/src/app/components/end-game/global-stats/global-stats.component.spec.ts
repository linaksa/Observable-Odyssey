import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlobalStatsComponent } from './global-stats.component';

describe('GlobalStatsComponent', () => {
  let component: GlobalStatsComponent;
  let fixture: ComponentFixture<GlobalStatsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlobalStatsComponent],
    })
    .compileComponents();

    fixture = TestBed.createComponent(GlobalStatsComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
