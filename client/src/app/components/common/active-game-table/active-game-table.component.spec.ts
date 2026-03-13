import { Component } from '@angular/core';
import { ComponentFixture, MetadataOverride, TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { ActiveGameTableService } from '@app/services/active-game-table.service';
import { SocketService } from '@app/services/socket.service';
import { Namespaces } from '@common/namespaces';
import { ActiveGameTableComponent } from './active-game-table.component';

@Component({
  selector: 'app-loading-overlay',
  standalone: true,
  template: '',
})
class MockAppLoadingOverlay {}

describe('ActiveGameTableComponent', () => {
  let component: ActiveGameTableComponent;
  let fixture: ComponentFixture<ActiveGameTableComponent>;

  let socketServiceMock: jasmine.SpyObj<SocketService>;
  let gameTableServiceMock: jasmine.SpyObj<ActiveGameTableService>;

  let eventSubject: Subject<void>;

  beforeEach(async () => {
    const overrideInfo: MetadataOverride<Component> = {
      set: { imports: [MockAppLoadingOverlay] },
    };
    TestBed.overrideComponent(ActiveGameTableComponent, overrideInfo);

    eventSubject = new Subject();

    socketServiceMock = jasmine.createSpyObj('SocketService', ['connect', 'on']);
    gameTableServiceMock = jasmine.createSpyObj('ActiveGameTableService', ['fetchJoinableActiveGames']);

    socketServiceMock.on.and.returnValue(eventSubject.asObservable());

    await TestBed.configureTestingModule({
      imports: [ActiveGameTableComponent],
      providers: [
        { provide: SocketService, useValue: socketServiceMock },
        { provide: ActiveGameTableService, useValue: gameTableServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveGameTableComponent);
    component = fixture.componentInstance;
  });

  it('should fetch games on init', () => {
    component.ngOnInit();

    expect(gameTableServiceMock.fetchJoinableActiveGames).toHaveBeenCalled();
    expect(socketServiceMock.connect).toHaveBeenCalledWith(Namespaces.ActiveGameAdmin);
  });


  it('should fetch games when JoinableGamesUpdated event is received', () => {
    component.ngOnInit();
    eventSubject.next();
    expect(gameTableServiceMock.fetchJoinableActiveGames).toHaveBeenCalledTimes(2);
  });

  it('should unsubscribe on destroy', () => {
    component.ngOnInit();

    const unsubscribeSpy = spyOn(component['socketSubscription'], 'unsubscribe');

    component.ngOnDestroy();
    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});