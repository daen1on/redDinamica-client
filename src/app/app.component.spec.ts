import { TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideLocationMocks } from '@angular/common/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AppComponent } from './app.component';
import { UserService } from './services/user.service';
import { NotificationService } from './services/notification.service';
import { MessageService } from './services/message.service';
import { of } from 'rxjs';
import { Router } from '@angular/router';

describe('AppComponent', () => {
  beforeEach(waitForAsync(() => {
    const messageServiceSpy = jasmine.createSpyObj('MessageService', ['getUnviewMessages']);
    messageServiceSpy.getUnviewMessages.and.returnValue(of({ unviewed: 0 }));
    TestBed.configureTestingModule({
      declarations: [
        AppComponent
      ],
      providers: [
        UserService,
        NotificationService,
        { provide: MessageService, useValue: messageServiceSpy },
        provideRouter([]),
        provideLocationMocks(),
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    }).compileComponents();
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'client'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toEqual('RedDinámica');
  });

  it('should render title in a h1 tag', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('h1').textContent).toContain('RedDinámica');
  });

  it('should toggle theme and set localStorage', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance as AppComponent;
    spyOn(localStorage, 'setItem');

    const initial = app.isDarkMode;
    app.toggleTheme();

    expect(app.isDarkMode).toBe(!initial);
    expect(localStorage.setItem).toHaveBeenCalledWith('rd_theme', app.isDarkMode ? 'dark' : 'light');
  });

  it('should compute unreadCountDisplay correctly', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance as AppComponent;

    app.unreadCount = 5;
    expect(app.unreadCountDisplay).toBe('5');
    app.unreadCount = 120;
    expect(app.unreadCountDisplay).toBe('99+');
  });

  it('should navigate to notifications on double bell click', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance as AppComponent;
    const router = TestBed.inject(Router) as Router;
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true) as any);

    (app as any).bellLastTap = Date.now() - 100; // simulate previous tap
    app.onBellClick(new MouseEvent('click') as any);

    expect(router.navigate).toHaveBeenCalledWith(['/notificaciones']);
  });
});
