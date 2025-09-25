import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';

import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        UserService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(NotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
// Mocks para NotificationService

class MockNotificationService {
  private notifications = [
    { id: 1, message: 'Notificación 1', read: false },
    { id: 2, message: 'Notificación 2', read: true }
  ];

  getNotifications() {
    // Simula una llamada observable
    return {
      subscribe: (fn: (notificaciones: any[]) => void) => fn(this.notifications)
    };
  }

  markAsRead(id: number) {
    const noti = this.notifications.find(n => n.id === id);
    if (noti) noti.read = true;
    return {
      subscribe: (fn: (res: any) => void) => fn({ success: !!noti })
    };
  }

  addNotification(notification: any) {
    this.notifications.push(notification);
    return {
      subscribe: (fn: (res: any) => void) => fn({ success: true })
    };
  }

  clearNotifications() {
    this.notifications = [];
    return {
      subscribe: (fn: (res: any) => void) => fn({ success: true })
    };
  }
}

// Ejemplo de uso del mock en pruebas
describe('MockNotificationService', () => {
  let mockService: MockNotificationService;

  beforeEach(() => {
    mockService = new MockNotificationService();
  });

  it('debería obtener notificaciones', () => {
    mockService.getNotifications().subscribe(notificaciones => {
      expect(notificaciones.length).toBe(2);
      expect(notificaciones[0].message).toBe('Notificación 1');
    });
  });

  it('debería marcar una notificación como leída', () => {
    mockService.markAsRead(1).subscribe(res => {
      expect(res.success).toBeTrue();
    });
    mockService.getNotifications().subscribe(notificaciones => {
      expect(notificaciones[0].read).toBeTrue();
    });
  });

  it('debería agregar una nueva notificación', () => {
    const nueva = { id: 3, message: 'Notificación 3', read: false };
    mockService.addNotification(nueva).subscribe(res => {
      expect(res.success).toBeTrue();
    });
    mockService.getNotifications().subscribe(notificaciones => {
      expect(notificaciones.length).toBe(3);
      expect(notificaciones[2].message).toBe('Notificación 3');
    });
  });

  it('debería limpiar todas las notificaciones', () => {
    mockService.clearNotifications().subscribe(res => {
      expect(res.success).toBeTrue();
    });
    mockService.getNotifications().subscribe(notificaciones => {
      expect(notificaciones.length).toBe(0);
    });
  });
});
