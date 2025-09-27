import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
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
  public loadingMore: boolean = false;
  public error: string = '';
  public currentPage: number = 1;
  public hasMoreNotifications: boolean = true;
  public isPageView: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private notificationService: NotificationService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isPageView = this.router.url.startsWith('/notificaciones');
    setTimeout(() => {
      this.loadNotifications();
      this.loadUnreadCount();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotifications(reset: boolean = true): void {
    const token = this.userService.getToken();
    const identity = this.userService.getIdentity();
    
    if (!token) {
      console.log('No hay token disponible para cargar notificaciones');
      this.error = 'Usuario no autenticado';
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
      setTimeout(() => {
        const retryIdentity = this.userService.getIdentity();
        if (retryIdentity) {
          this.loadNotifications();
        }
      }, 500);
      return;
    }
    
    if (!identity.actived) {
      console.log('Usuario no activado, no se cargan notificaciones');
      this.error = 'Usuario no activado';
      return;
    }

    if (reset) {
      this.loading = true;
      this.currentPage = 1;
    } else {
      this.loadingMore = true;
    }
    
    this.error = '';
    
    this.notificationService.getNotifications(this.currentPage, 20)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('Notifications response:', response);
          const newNotifications = response.notifications || [];
          
          if (reset) {
            this.notifications = newNotifications;
          } else {
            this.notifications = [...this.notifications, ...newNotifications];
          }
          
          this.unreadCount = response.unreadCount || 0;
          this.hasMoreNotifications = newNotifications.length === 20;
          this.loading = false;
          this.loadingMore = false;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.error = 'Error al cargar notificaciones';
          this.loading = false;
          this.loadingMore = false;
        }
      });
  }

  onListScroll(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target) return;
    const threshold = 60; // px antes del final
    const reachedBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - threshold;
    if (reachedBottom) {
      this.loadMoreNotifications();
    }
  }

  goToAllNotifications(): void {
    this.closeDropdown();
    this.router.navigate(['/notificaciones']);
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

  onNotificationClick(notification: Notification): void {
    if (!notification.read) {
      this.markAsRead(notification);
    }

    this.navigateToNotificationTarget(notification);
    
    setTimeout(() => {
      this.closeDropdown();
    }, 100);
  }

  private navigateToNotificationTarget(notification: Notification): void {
    try {
      switch (notification.type) {
        case 'comment':
          this.handleCommentNotification(notification);
          break;
        case 'follow':
          this.handleFollowNotification(notification);
          break;
        case 'message':
          this.handleMessageNotification(notification);
          break;
        case 'lesson':
          this.handleLessonNotification(notification);
          break;
        case 'publication':
          this.handlePublicationNotification(notification);
          break;
        case 'resource':
          this.handleResourceNotification(notification);
          break;
        default:
          this.handleDefaultNotification(notification);
      }
    } catch (error) {
      console.error('Error navigating to notification target:', error);
      if (notification.link) {
        this.router.navigateByUrl(notification.link);
      }
    }
  }

  private handleCommentNotification(notification: Notification): void {
    // Para comentarios y menciones, usar la nueva vista de publicación específica
    if (notification.relatedId) {
      this.router.navigate(['/inicio/publicacion', notification.relatedId], { 
        queryParams: { highlight: 'comment' }
      });
    } else if (notification.link) {
      this.router.navigateByUrl(notification.link);
    } else {
      this.router.navigate(['/inicio']);
    }
  }

  private handleFollowNotification(notification: Notification): void {
    // Priorizar el link si existe (formato correcto: /perfil/{id}/publicaciones)
    if (notification.link) {
      console.log('Using follow notification link:', notification.link);
      this.router.navigateByUrl(notification.link);
    } else if (notification.from) {
      console.log('Using fallback follow navigation:', notification.from);
      this.router.navigate(['/perfil', notification.from, 'publicaciones']);
    } else {
      console.log('Using default follow navigation');
      this.router.navigate(['/inicio']);
    }
  }

  private handleMessageNotification(notification: Notification): void {
    if (notification.relatedId) {
      this.router.navigate(['/mensajes'], { 
        queryParams: { messageId: notification.relatedId }
      });
    } else {
      this.router.navigate(['/mensajes']);
    }
  }

  private handleLessonNotification(notification: Notification): void {
    // Priorizar el link si existe (para casos específicos como invitaciones de facilitador)
    if (notification.link) {
      console.log('Using notification link:', notification.link);
      this.router.navigateByUrl(notification.link);
    } else if (notification.relatedId) {
      console.log('Using fallback lesson route:', notification.relatedId);
      this.router.navigate(['/inicio/leccion', notification.relatedId]);
    } else {
      console.log('Using default lessons route');
      this.router.navigate(['/inicio/lecciones']);
    }
  }

  private handlePublicationNotification(notification: Notification): void {
    // Para publicaciones, usar la nueva vista de publicación específica
    if (notification.relatedId) {
      this.router.navigate(['/inicio/publicacion', notification.relatedId], { 
        queryParams: { highlight: 'publication' }
      });
    } else if (notification.link) {
      this.router.navigateByUrl(notification.link);
    } else {
      this.router.navigate(['/inicio']);
    }
  }

  private handleResourceNotification(notification: Notification): void {
    if (notification.relatedId) {
      this.router.navigate(['/inicio/recursos'], { 
        queryParams: { resourceId: notification.relatedId }
      });
    } else if (notification.link) {
      this.router.navigateByUrl(notification.link);
    } else {
      this.router.navigate(['/inicio/recursos']);
    }
  }

  private handleDefaultNotification(notification: Notification): void {
    if (notification.link) {
      this.router.navigateByUrl(notification.link);
    } else {
      this.router.navigate(['/inicio']);
    }
  }

  markAsRead(notification: Notification): void {
    if (notification.read) return;

    this.notificationService.markAsRead(notification._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          notification.read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notifications.forEach(notification => notification.read = true);
          this.unreadCount = 0;
          console.log('Todas las notificaciones marcadas como leídas');
        },
        error: (error) => {
          console.error('Error marking all notifications as read:', error);
        }
      });
  }

  refreshNotifications(): void {
    this.loadNotifications(true);
    this.loadUnreadCount();
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
      case 'publication': return 'fas fa-newspaper';
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
      case 'publication': return 'text-primary';
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

  loadMoreNotifications(): void {
    if (this.loadingMore || !this.hasMoreNotifications) {
      return;
    }
    
    this.currentPage += 1;
    this.loadNotifications(false);
  }

  closeDropdown(): void {
    const dropdownElement = document.querySelector('.notifications-container')?.closest('.dropdown');
    if (dropdownElement) {
      const dropdownToggle = dropdownElement.querySelector('[data-bs-toggle="dropdown"]') as HTMLElement;
      if (dropdownToggle) {
        dropdownToggle.click();
      }
    }
  }
}
