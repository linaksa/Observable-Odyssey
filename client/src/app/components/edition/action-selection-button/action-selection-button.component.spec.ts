import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionSelectionButtonComponent } from './action-selection-button.component';

describe('ActionSelectionButtonComponent', () => {
  let component: ActionSelectionButtonComponent;
  let fixture: ComponentFixture<ActionSelectionButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionSelectionButtonComponent],
    })
    .compileComponents();

    fixture = TestBed.createComponent(ActionSelectionButtonComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
