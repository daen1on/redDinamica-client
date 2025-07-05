import { Component, OnInit, OnDestroy } from '@angular/core';
import { NotificationService } from '../../services/notification.service';
import { Notification } from '../../models/notification.model';
import { UserService } from '../../services/user.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-notifications',
    templateUrl: './notifications.component.html',
    styleUrls: ['./notifications.component.css'],
    standalone: false
})
export class NotificationsComponent implements OnInit, OnDestroy {
  public notifications: Notification[] = [];
  public unreadCount: number = 0;
  public loading: boolean = false;
  public error: string = '';
  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    // Usar setTimeout para asegurar que el componente esté completamente inicializado
    setTimeout(() => {
      this.loadNotifications();
      this.loadUnreadCount();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotifications(): void {
    const token = this.userService.getToken();
    const identity = this.userService.getIdentity();
    
    if (!token) {
      console.log('No hay token disponible para cargar notificaciones');
      this.error = 'Usuario no autenticado';
      // Intentar recargar después de un breve delay
      setTimeout(() => {
        const retryToken = this.userService.getToken();
        if (retryToken) {
          this.loadNotifications();
        }
      }, 500);
      return;
    }
    
    if (!identity) {
      console.log('No hay identity disponible para cargar notificaciones');
      this.error = 'Usuario no autenticado';
      // Intentar recargar después de un breve delay
      setTimeout(() => {
        const retryIdentity = this.userService.getIdentity();
        if (retryIdentity) {
          this.loadNotifications();
        }
      }, 500);
      return;
    }
    
    // Verificar que el usuario esté activado
    if (!identity.actived) {
      console.log('Usuario no activado, no se cargan notificaciones');
      this.error = 'Usuario no activado';
      return;
    }

    this.loading = true;
    this.error = '';
    
    this.notificationService.getNotifications(1, 20)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Notifications response:', response);
          this.notifications = response.notifications || [];
          this.unreadCount = response.unreadCount || 0;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.error = 'Error al cargar notificaciones';
          this.loading = false;
        }
      });
  }

  loadUnreadCount(): void {
    const token = this.userService.getToken();
    const identity = this.userService.getIdentity();
    
    if (!token || !identity || !identity.actived) {
      return;
    }

    this.notificationService.getUnreadCount()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.unreadCount = response.unreadCount || 0;
        },
        error: (error) => {
          console.error('Error loading unread count:', error);
        }
      });
  }

  markAsRead(notification: Notification): void {
    if (notification.read) return;

    this.notificationService.markAsRead(notification._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          notification.read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
          // Cerrar el dropdown después de marcar como leída
          this.closeDropdown();
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
  }

  closeDropdown(): void {
    // Cerrar el dropdown de notificaciones
    const dropdownElement = document.querySelector('#notificationDropdown');
    if (dropdownElement) {
      // Usar Bootstrap 5 para cerrar el dropdown
      const dropdown = (window as any).bootstrap?.Dropdown?.getInstance(dropdownElement);
      if (dropdown) {
        dropdown.hide();
      } else {
        // Fallback: remover la clase show manualmente
        const dropdownMenu = document.querySelector('.dropdown-menu[aria-labelledby="notificationDropdown"]');
        if (dropdownMenu) {
          dropdownMenu.classList.remove('show');
          dropdownElement.setAttribute('aria-expanded', 'false');
        }
      }
    }
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications.forEach(notification => notification.read = true);
          this.unreadCount = 0;
          // Cerrar dropdown después de marcar todas como leídas
          this.closeDropdown();
        },
        error: (error) => {
          console.error('Error marking all notifications as read:', error);
        }
      });
  }

  deleteNotification(notification: Notification): void {
    this.notificationService.deleteNotification(notification._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications = this.notifications.filter(n => n._id !== notification._id);
          if (!notification.read) {
            this.unreadCount = Math.max(0, this.unreadCount - 1);
          }
        },
        error: (error) => {
          console.error('Error deleting notification:', error);
        }
      });
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'comment': return 'fas fa-comment';
      case 'follow': return 'fas fa-user-plus';
      case 'lesson': return 'fas fa-chalkboard-teacher';
      case 'message': return 'fas fa-envelope';
      case 'resource': return 'fas fa-file-alt';
      case 'system': return 'fas fa-cog';
      default: return 'fas fa-bell';
    }
  }

  getNotificationColor(type: string): string {
    switch (type) {
      case 'comment': return 'text-primary';
      case 'follow': return 'text-success';
      case 'lesson': return 'text-warning';
      case 'message': return 'text-info';
      case 'resource': return 'text-secondary';
      case 'system': return 'text-danger';
      default: return 'text-muted';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 1) return 'Ahora';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInDays < 7) return `${diffInDays}d`;
    
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  }

  trackByNotificationId(index: number, notification: Notification): string {
    return notification._id;
  }
}
