import { Component } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { JoinPageComponent } from './join-page.component';

@Component({
  selector: 'app-active-game-table',
  standalone: true,
  template: '',
})
class MockActiveGameTableComponent {}

describe('JoinPageComponent', () => {
  let component: JoinPageComponent;
  let fixture: ComponentFixture<JoinPageComponent>;

  beforeEach(async () => {
    const overrideInfo: MetadataOverride<Component> = {
      set: { imports: [MockActiveGameTableComponent] },
    };
    TestBed.overrideComponent(JoinPageComponent, overrideInfo);

    await TestBed.configureTestingModule({
      imports: [JoinPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(JoinPageComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});