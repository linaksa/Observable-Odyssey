import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CombatTurnResultComponent } from './combat-turn-result.component';

describe('CombatTurnResultComponent', () => {
  let component: CombatTurnResultComponent;
  let fixture: ComponentFixture<CombatTurnResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CombatTurnResultComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CombatTurnResultComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
