import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SessionUnavailable } from './session-unavailable';

describe('SessionUnavailable', () => {
  let component: SessionUnavailable;
  let fixture: ComponentFixture<SessionUnavailable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SessionUnavailable],
    }).compileComponents();

    fixture = TestBed.createComponent(SessionUnavailable);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
