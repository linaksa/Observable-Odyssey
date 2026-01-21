import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GameCreationDialogComponent } from './game-creation-dialog.component';

describe('GameCreationDialogComponent', () => {
  let component: GameCreationDialogComponent;
  let fixture: ComponentFixture<GameCreationDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GameCreationDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GameCreationDialogComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
