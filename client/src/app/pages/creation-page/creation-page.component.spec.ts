import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreationPageComponent } from './creation-page.component';

describe('CreationPageComponent', () => {
  let component: CreationPageComponent;
  let fixture: ComponentFixture<CreationPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreationPageComponent],
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreationPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
