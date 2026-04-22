import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { NotificationsComponent } from './notifications.component';
import { NotificationService } from '../../services/notification.service';
import { UserService } from '../../services/user.service';
import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';

describe('NotificationComponent', () => {
  let component: NotificationsComponent;
  let fixture: ComponentFixture<NotificationsComponent>;
  let notificationServiceSpy: jasmine.SpyObj<NotificationService>;
  let userServiceSpy: jasmine.SpyObj<UserService>;
  let router: Router;

  beforeEach(async () => {
    const notifSpy = jasmine.createSpyObj('NotificationService', [
      'getNotifications',
      'getUnreadCount',
      'markAsRead',
      'markAllAsRead',
      'deleteNotification'
    ]);
    const userSpy = jasmine.createSpyObj('UserService', ['getToken', 'getIdentity']);

    await TestBed.configureTestingModule({
			imports: [NotificationsComponent],
      providers: [
        { provide: NotificationService, useValue: notifSpy },
        { provide: UserService, useValue: userSpy },
        provideHttpClient(),
				provideHttpClientTesting(),
				provideRouter([])
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(NotificationsComponent);
    component = fixture.componentInstance;
    notificationServiceSpy = TestBed.inject(NotificationService) as jasmine.SpyObj<NotificationService>;
    userServiceSpy = TestBed.inject(UserService) as jasmine.SpyObj<UserService>;
    router = TestBed.inject(Router);
    userServiceSpy.getToken.and.returnValue('token');
    userServiceSpy.getIdentity.and.returnValue({ _id: '1', actived: true } as any);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load notifications (reset) successfully', () => {
    const server = {
      notifications: [{ _id: 'n1', type: 'message', read: false }],
      unreadCount: 1
    };
    notificationServiceSpy.getNotifications.and.returnValue(of(server as any));

    component.loadNotifications(true);

    expect(notificationServiceSpy.getNotifications).toHaveBeenCalledWith(1, 20);
    expect(component.notifications.length).toBe(1);
    expect(component.unreadCount).toBe(1);
    expect(component.loading).toBeFalse();
    expect(component.hasMoreNotifications).toBeFalse();
  });

  it('should append notifications when loading more', () => {
    const page1 = { notifications: Array.from({ length: 20 }, (_, i) => ({ _id: 'n' + (i + 1), type: 'comment', read: true })), unreadCount: 0 };
    const page2 = { notifications: Array.from({ length: 5 }, (_, i) => ({ _id: 'n' + (21 + i), type: 'comment', read: true })), unreadCount: 0 };
    notificationServiceSpy.getNotifications.and.returnValues(of(page1 as any), of(page2 as any));

    component.loadNotifications(true);
    expect(component.notifications.length).toBe(20);
    expect(component.hasMoreNotifications).toBeTrue();

    component.loadMoreNotifications();
    expect(component.notifications.length).toBe(25);
    expect(component.currentPage).toBe(2);
    expect(component.hasMoreNotifications).toBeFalse();
  });

  it('should handle load notifications error', () => {
    notificationServiceSpy.getNotifications.and.returnValue(throwError(() => 'Error'));

    component.loadNotifications(true);

    expect(component.error).toBe('Error al cargar notificaciones');
    expect(component.loading).toBeFalse();
  });

  it('should not load notifications without token', () => {
    userServiceSpy.getToken.and.returnValue(null as any);

    component.loadNotifications(true);

    expect(component.error).toBe('Usuario no autenticado');
    expect(notificationServiceSpy.getNotifications).not.toHaveBeenCalled();
  });

  it('should mark notification as read and decrement unreadCount', () => {
    const n = { _id: 'n1', type: 'message', read: false } as any;
    component.unreadCount = 2;
    notificationServiceSpy.markAsRead.and.returnValue(of({}));

    component.markAsRead(n);

    expect(notificationServiceSpy.markAsRead).toHaveBeenCalledWith('n1');
    expect(n.read).toBeTrue();
    expect(component.unreadCount).toBe(1);
  });

  it('should mark all as read and set unreadCount to 0', () => {
    component.notifications = [{ _id: 'n1', read: false } as any, { _id: 'n2', read: false } as any];
    component.unreadCount = 2;
    notificationServiceSpy.markAllAsRead.and.returnValue(of({}));

    component.markAllAsRead();

    expect(notificationServiceSpy.markAllAsRead).toHaveBeenCalled();
    expect(component.notifications.every(n => n.read)).toBeTrue();
    expect(component.unreadCount).toBe(0);
  });

  it('should delete notification and update unreadCount if needed', () => {
    const n1 = { _id: 'n1', read: false } as any;
    const n2 = { _id: 'n2', read: true } as any;
    component.notifications = [n1, n2];
    component.unreadCount = 1;
    notificationServiceSpy.deleteNotification.and.returnValue(of({}));

    component.deleteNotification(n1);

    expect(notificationServiceSpy.deleteNotification).toHaveBeenCalledWith('n1');
    expect(component.notifications.find(n => n._id === 'n1')).toBeUndefined();
    expect(component.unreadCount).toBe(0);
  });

  it('should load unread count when identity/token are valid', () => {
    notificationServiceSpy.getUnreadCount.and.returnValue(of({ unreadCount: 3 } as any));

    component.loadUnreadCount();

    expect(notificationServiceSpy.getUnreadCount).toHaveBeenCalled();
    expect(component.unreadCount).toBe(3);
  });

  it('should navigate using notification link on lesson type', () => {
    const navSpy = spyOn(router, 'navigateByUrl');
    const n = { _id: 'n1', type: 'lesson', read: true, link: '/inicio/leccion/123' } as any;
    spyOn(component as any, 'markAsRead').and.stub();

    component.onNotificationClick(n);

    expect(navSpy).toHaveBeenCalledWith('/inicio/leccion/123');
  });

  it('should map icons and colors correctly', () => {
    expect(component.getNotificationIcon('comment')).toContain('comment');
    expect(component.getNotificationIcon('unknown')).toContain('bell');
    expect(component.getNotificationColor('follow')).toContain('success');
    expect(component.getNotificationColor('unknown')).toContain('muted');
  });

  it('should format date for minutes ago', () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(component.formatDate(fiveMinAgo)).toBe('5m');
  });

  it('should track by notification id', () => {
    const n = { _id: 'abc' } as any;
    expect(component.trackByNotificationId(0, n)).toBe('abc');
  });
});
