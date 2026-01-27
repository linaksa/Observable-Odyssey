import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditionCellComponent } from './edition-cell.component';

describe('EditionCellComponent', () => {
  let component: EditionCellComponent;
  let fixture: ComponentFixture<EditionCellComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditionCellComponent],
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditionCellComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
